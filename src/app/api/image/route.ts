// @ts-nocheck
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { messages, apiKeys, conversations } from "@/lib/db/schema";
import { requireApprovedUser } from "@/lib/api-guards";
import { decrypt } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  const { user, error } = await requireApprovedUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const prompt: string = body?.prompt?.trim() ?? "";
  const conversationId: string = body?.conversationId ?? "";
  if (!prompt) return NextResponse.json({ error: "Enter a prompt." }, { status: 400 });

  // Find an OpenAI key for DALL-E
  let apiKey = process.env.OPENAI_KEY ?? "";
  if (!apiKey) {
    const [keyRow] = await db.select().from(apiKeys).where(and(eq(apiKeys.userId, user!.id), eq(apiKeys.provider, "OPENAI"))).limit(1);
    if (keyRow) apiKey = decrypt(keyRow.encryptedKey);
  }

  // Also try Gemini for image generation if no OpenAI key
  let googleKey = process.env.GOOGLE_AI_KEY ?? "";
  if (!googleKey && !apiKey) {
    const [keyRow] = await db.select().from(apiKeys).where(and(eq(apiKeys.userId, user!.id), eq(apiKeys.provider, "GOOGLE"))).limit(1);
    if (keyRow) googleKey = decrypt(keyRow.encryptedKey);
  }

  if (!apiKey && !googleKey) {
    return NextResponse.json({ error: "Image generation needs an OpenAI key (for DALL-E 3) or Google AI key. Add one in Settings." }, { status: 400 });
  }

  try {
    let imageUrl: string | null = null;
    let revisedPrompt: string | undefined;

    if (apiKey) {
      // DALL-E 3 via OpenAI
      const res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: "dall-e-3", prompt, n: 1, size: "1024x1024", quality: "standard" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? "Image generation failed.");
      imageUrl = data.data?.[0]?.url;
      revisedPrompt = data.data?.[0]?.revised_prompt;
    } else if (googleKey) {
      // Gemini image generation (Imagen 3)
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": googleKey },
          body: JSON.stringify({ instances: [{ prompt }], parameters: { sampleCount: 1, aspectRatio: "1:1" } }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? "Gemini image generation failed.");
      const b64 = data.predictions?.[0]?.bytesBase64Encoded;
      if (b64) imageUrl = `data:image/png;base64,${b64}`;
    }

    if (!imageUrl) throw new Error("No image returned.");

    // Save user message + image message to conversation
    if (conversationId) {
      const [conv] = await db.select({ id: conversations.id }).from(conversations).where(and(eq(conversations.id, conversationId), eq(conversations.userId, user!.id))).limit(1);
      if (conv) {
        await db.insert(messages).values([
          { conversationId, role: "user", content: { type: "text", text: `Generate an image: ${prompt}` } },
          { conversationId, role: "assistant", content: { type: "image", url: imageUrl, prompt, revised: revisedPrompt } },
        ]);
        await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, conversationId));
      }
    }

    return NextResponse.json({ url: imageUrl, revised: revisedPrompt });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Image generation failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

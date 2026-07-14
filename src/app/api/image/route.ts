// @ts-nocheck
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { messages, apiKeys, conversations } from "@/lib/db/schema";
import { requireApprovedUser } from "@/lib/api-guards";
import { decrypt } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  const { user, error } = await requireApprovedUser();
  if (error) return error;

  const { prompt, conversationId } = await req.json();
  if (!prompt) return NextResponse.json({ error: "Enter a prompt." }, { status: 400 });

  // Try Google AI key first (free Imagen)
  let googleKey = process.env.GOOGLE_AI_KEY || "";
  if (!googleKey) {
    const [k] = await db.select().from(apiKeys).where(and(eq(apiKeys.userId, user.id), eq(apiKeys.provider, "GOOGLE"))).limit(1);
    if (k) googleKey = decrypt(k.encryptedKey);
  }

  // Try OpenAI key for DALL-E
  let openaiKey = process.env.OPENAI_KEY || "";
  if (!openaiKey) {
    const [k] = await db.select().from(apiKeys).where(and(eq(apiKeys.userId, user.id), eq(apiKeys.provider, "OPENAI"))).limit(1);
    if (k) openaiKey = decrypt(k.encryptedKey);
  }

  try {
    let imageUrl = null;
    let revised = null;

    if (openaiKey) {
      // DALL-E 3
      const res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({ model: "dall-e-3", prompt, n: 1, size: "1024x1024" }),
      });
      const d = await res.json();
      if (res.ok && d.data?.[0]?.url) {
        imageUrl = d.data[0].url;
        revised = d.data[0].revised_prompt;
      }
    }

    if (!imageUrl && googleKey) {
      // Gemini Imagen 3
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": googleKey },
          body: JSON.stringify({ instances: [{ prompt }], parameters: { sampleCount: 1, aspectRatio: "1:1" } }),
        }
      );
      const d = await res.json();
      if (res.ok && d.predictions?.[0]?.bytesBase64Encoded) {
        imageUrl = `data:image/png;base64,${d.predictions[0].bytesBase64Encoded}`;
      } else {
        // Try Gemini 2.0 flash image generation
        const res2 = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent",
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": googleKey },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseModalities: ["IMAGE", "TEXT"] }
            }),
          }
        );
        const d2 = await res2.json();
        const imgPart = d2.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
        if (imgPart?.inlineData?.data) {
          imageUrl = `data:image/png;base64,${imgPart.inlineData.data}`;
        }
      }
    }

    if (!imageUrl) {
      return NextResponse.json({ error: "Image generation failed. Make sure you have a Google AI or OpenAI key in Settings." }, { status: 500 });
    }

    if (conversationId) {
      const [conv] = await db.select({ id: conversations.id }).from(conversations)
        .where(and(eq(conversations.id, conversationId), eq(conversations.userId, user.id))).limit(1);
      if (conv) {
        await db.insert(messages).values([
          { conversationId, role: "user", content: { type: "text", text: `Generate an image: ${prompt}` } },
          { conversationId, role: "assistant", content: { type: "image", url: imageUrl, prompt, revised } },
        ]);
        await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, conversationId));
      }
    }

    return NextResponse.json({ url: imageUrl, revised });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Image generation failed." }, { status: 500 });
  }
}

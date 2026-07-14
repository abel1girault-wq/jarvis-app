// @ts-nocheck
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversations, apiKeys } from "@/lib/db/schema";
import { requireApprovedUser } from "@/lib/api-guards";

export async function GET() {
  const { user, error } = await requireApprovedUser();
  if (error) return error;
  const rows = await db.select({
    id: conversations.id, title: conversations.title, model: conversations.model,
    provider: conversations.provider, pinned: conversations.pinned,
    createdAt: conversations.createdAt, updatedAt: conversations.updatedAt,
  }).from(conversations).where(eq(conversations.userId, user!.id)).orderBy(desc(conversations.updatedAt)).limit(100);
  return NextResponse.json({ conversations: rows });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireApprovedUser();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const model = typeof body?.model === "string" ? body.model : "gemini-2.0-flash";
  const provider = typeof body?.provider === "string" ? body.provider : "GOOGLE";
  const apiKeyId = typeof body?.apiKeyId === "string" ? body.apiKeyId : null;

  // Validate apiKeyId belongs to user
  let resolvedKeyId: string | null = apiKeyId;
  if (apiKeyId) {
    const [key] = await db.select({ id: apiKeys.id }).from(apiKeys).where(eq(apiKeys.id, apiKeyId)).limit(1);
    if (!key || key.id !== apiKeyId) resolvedKeyId = null;
  }

  const [conv] = await db.insert(conversations).values({
    userId: user!.id, model, provider: provider as "OPENAI" | "ANTHROPIC" | "GOOGLE" | "GROQ" | "CUSTOM",
    apiKeyId: resolvedKeyId,
  }).returning();

  return NextResponse.json({ conversation: conv });
}

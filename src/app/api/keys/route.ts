// @ts-nocheck
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { requireApprovedUser } from "@/lib/api-guards";
import { encrypt, last4 } from "@/lib/crypto";

const VALID_PROVIDERS = ["OPENAI", "ANTHROPIC", "GOOGLE", "GROQ", "CUSTOM"] as const;

async function seedEnvKeys(userId: string) {
  const envKeys: Array<{ provider: typeof VALID_PROVIDERS[number]; label: string; key: string; baseUrl?: string }> = [];
  if (process.env.ANTHROPIC_KEY) envKeys.push({ provider: "ANTHROPIC", label: "Claude (built-in)", key: process.env.ANTHROPIC_KEY });
  if (process.env.GOOGLE_AI_KEY) envKeys.push({ provider: "GOOGLE", label: "Gemini (built-in)", key: process.env.GOOGLE_AI_KEY });
  if (process.env.OPENAI_KEY) envKeys.push({ provider: "OPENAI", label: "OpenAI (built-in)", key: process.env.OPENAI_KEY });
  if (process.env.GROQ_KEY) envKeys.push({ provider: "GROQ", label: "Groq (built-in)", key: process.env.GROQ_KEY, baseUrl: "https://api.groq.com/openai/v1" });
  for (const k of envKeys) {
    const [ex] = await db.select({ id: apiKeys.id }).from(apiKeys).where(and(eq(apiKeys.userId, userId), eq(apiKeys.label, k.label))).limit(1);
    if (!ex) await db.insert(apiKeys).values({ provider: k.provider, label: k.label, encryptedKey: encrypt(k.key), last4: last4(k.key), baseUrl: k.baseUrl ?? null, userId }).catch(() => null);
  }
}

export async function GET() {
  const { user, error } = await requireApprovedUser();
  if (error) return error;
  await seedEnvKeys(user!.id).catch(() => null);
  const rows = await db.select({ id: apiKeys.id, provider: apiKeys.provider, label: apiKeys.label, baseUrl: apiKeys.baseUrl, last4: apiKeys.last4, createdAt: apiKeys.createdAt }).from(apiKeys).where(eq(apiKeys.userId, user!.id));
  return NextResponse.json({ keys: rows });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireApprovedUser();
  if (error) return error;
  const body = await req.json().catch(() => null);
  const provider = body?.provider; const label = typeof body?.label === "string" ? body.label.trim() : "";
  const key = typeof body?.key === "string" ? body.key.trim() : ""; const baseUrl = typeof body?.baseUrl === "string" ? body.baseUrl.trim() : null;
  if (!VALID_PROVIDERS.includes(provider)) return NextResponse.json({ error: "Invalid provider." }, { status: 400 });
  if (!label) return NextResponse.json({ error: "Give this key a label." }, { status: 400 });
  if (!key) return NextResponse.json({ error: "Paste the API key." }, { status: 400 });
  const [ex] = await db.select({ id: apiKeys.id }).from(apiKeys).where(and(eq(apiKeys.userId, user!.id), eq(apiKeys.provider, provider), eq(apiKeys.label, label))).limit(1);
  const values = { provider, label, baseUrl: provider === "CUSTOM" ? baseUrl : null, encryptedKey: encrypt(key), last4: last4(key) };
  if (ex) { await db.update(apiKeys).set(values).where(eq(apiKeys.id, ex.id)); return NextResponse.json({ id: ex.id, updated: true }); }
  const [created] = await db.insert(apiKeys).values({ ...values, userId: user!.id }).returning({ id: apiKeys.id });
  return NextResponse.json({ id: created.id, updated: false });
}

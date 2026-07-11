import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { googleTokens } from "@/lib/db/schema";
import { requireApprovedUser } from "@/lib/api-guards";
export async function GET() {
  const { user, error } = await requireApprovedUser();
  if (error) return error;
  const [t] = await db.select({ email: googleTokens.email, name: googleTokens.name }).from(googleTokens).where(eq(googleTokens.userId, user!.id)).limit(1);
  return NextResponse.json({ connected: !!t, email: t?.email ?? null, name: t?.name ?? null });
}
export async function DELETE() {
  const { user, error } = await requireApprovedUser();
  if (error) return error;
  await db.delete(googleTokens).where(eq(googleTokens.userId, user!.id));
  return NextResponse.json({ ok: true });
}

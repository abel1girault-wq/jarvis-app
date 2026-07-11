import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversations, messages } from "@/lib/db/schema";
import { requireApprovedUser } from "@/lib/api-guards";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireApprovedUser();
  if (error) return error;
  const { id } = await params;
  const [conv] = await db.select().from(conversations).where(and(eq(conversations.id, id), eq(conversations.userId, user!.id))).limit(1);
  if (!conv) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(messages.createdAt);
  return NextResponse.json({ conversation: conv, messages: msgs });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireApprovedUser();
  if (error) return error;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body?.title === "string") update.title = body.title.trim().slice(0, 100);
  if (typeof body?.pinned === "boolean") update.pinned = body.pinned;
  if (typeof body?.model === "string") update.model = body.model;
  if (typeof body?.provider === "string") update.provider = body.provider;
  await db.update(conversations).set(update).where(and(eq(conversations.id, id), eq(conversations.userId, user!.id)));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireApprovedUser();
  if (error) return error;
  const { id } = await params;
  await db.delete(conversations).where(and(eq(conversations.id, id), eq(conversations.userId, user!.id)));
  return NextResponse.json({ ok: true });
}

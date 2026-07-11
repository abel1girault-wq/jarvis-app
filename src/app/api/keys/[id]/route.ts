import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { requireApprovedUser } from "@/lib/api-guards";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireApprovedUser();
  if (error) return error;
  const { id } = await params;
  await db.delete(apiKeys).where(and(eq(apiKeys.id, id), eq(apiKeys.userId, user!.id)));
  return NextResponse.json({ ok: true });
}

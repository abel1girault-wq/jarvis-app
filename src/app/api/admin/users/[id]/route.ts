import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/api-guards";
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;
  const { status } = await req.json().catch(() => ({}));
  if (!["PENDING","APPROVED","REJECTED"].includes(status)) return NextResponse.json({ error: "Invalid." }, { status: 400 });
  await db.update(users).set({ status }).where(eq(users.id, id));
  return NextResponse.json({ ok: true });
}

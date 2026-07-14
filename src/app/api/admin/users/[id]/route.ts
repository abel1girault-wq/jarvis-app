// @ts-nocheck
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/api-guards";

export const dynamic = "force-dynamic";

export async function PATCH(req, context) {
  const { error } = await requireAdmin();
  if (error) return error;
  const id = context.params.id;
  const body = await req.json().catch(() => ({}));
  const status = body.status;
  if (!["PENDING","APPROVED","REJECTED"].includes(status)) {
    return NextResponse.json({ error: "Invalid." }, { status: 400 });
  }
  await db.update(users).set({ status }).where(eq(users.id, id));
  return NextResponse.json({ ok: true });
}

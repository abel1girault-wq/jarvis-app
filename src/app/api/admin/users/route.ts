import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/api-guards";
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const rows = await db.select({ id: users.id, email: users.email, name: users.name, role: users.role, status: users.status, createdAt: users.createdAt }).from(users);
  return NextResponse.json({ users: rows });
}

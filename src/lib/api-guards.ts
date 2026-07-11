import { NextResponse } from "next/server";
import { getCurrentUser } from "./auth";
export async function requireApprovedUser() {
  const user = await getCurrentUser();
  if (!user) return { user: null, error: NextResponse.json({ error: "Not signed in." }, { status: 401 }) };
  if (user.status !== "APPROVED") return { user: null, error: NextResponse.json({ error: "Account pending." }, { status: 403 }) };
  return { user, error: null as null };
}
export async function requireAdmin() {
  const { user, error } = await requireApprovedUser();
  if (error) return { user: null, error };
  if (user!.role !== "ADMIN") return { user: null, error: NextResponse.json({ error: "Admin only." }, { status: 403 }) };
  return { user, error: null as null };
}

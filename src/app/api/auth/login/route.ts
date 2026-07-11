import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifyPassword, signSession, SESSION_COOKIE, sessionCookieOptions, toPublicUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password) return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !await verifyPassword(password, user.passwordHash)) return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  const res = NextResponse.json({ user: toPublicUser(user) });
  res.cookies.set(SESSION_COOKIE, await signSession(user.id), sessionCookieOptions);
  return res;
}

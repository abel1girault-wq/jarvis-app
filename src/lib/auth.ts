import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "./db/schema";
import { SESSION_COOKIE, sessionCookieOptions, SESSION_DURATION_SECONDS } from "./session-constants";
export { SESSION_COOKIE, sessionCookieOptions };

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) throw new Error("JWT_SECRET not set. Run: openssl rand -base64 32");
  return new TextEncoder().encode(s);
}
export async function hashPassword(p: string) { return bcrypt.hash(p, 12); }
export async function verifyPassword(p: string, h: string) { return bcrypt.compare(p, h); }
export async function signSession(userId: string) {
  return new SignJWT({ sub: userId }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${SESSION_DURATION_SECONDS}s`).sign(secret());
}
export async function verifySessionToken(token: string): Promise<string | null> {
  try { const { payload } = await jwtVerify(token, secret()); return typeof payload.sub === "string" ? payload.sub : null; } catch { return null; }
}
export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const userId = await verifySessionToken(token);
  if (!userId) return null;
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return user ?? null;
}
export function toPublicUser(u: typeof users.$inferSelect) {
  return { id: u.id, email: u.email, name: u.name, role: u.role, status: u.status, createdAt: u.createdAt };
}

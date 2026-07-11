import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { googleTokens } from "@/lib/db/schema";
import { verifySessionToken } from "@/lib/auth";
import { exchangeCodeForTokens, getGoogleUserInfo } from "@/lib/google-oauth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code"); const state = searchParams.get("state");
  const base = process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000";
  if (searchParams.get("error")) return NextResponse.redirect(`${base}/settings?google=error`);
  if (!code || !state) return NextResponse.redirect(`${base}/settings?google=error`);
  const userId = await verifySessionToken(state);
  if (!userId) return NextResponse.redirect(`${base}/settings?google=error`);
  try {
    const tokens = await exchangeCodeForTokens(code);
    const info = await getGoogleUserInfo(tokens.access_token);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    const [ex] = await db.select({ id: googleTokens.id }).from(googleTokens).where(eq(googleTokens.userId, userId)).limit(1);
    if (ex) {
      await db.update(googleTokens).set({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token ?? undefined, expiresAt, email: info?.email, name: info?.name, updatedAt: new Date() }).where(eq(googleTokens.userId, userId));
    } else {
      await db.insert(googleTokens).values({ userId, accessToken: tokens.access_token, refreshToken: tokens.refresh_token ?? null, expiresAt, email: info?.email, name: info?.name });
    }
    return NextResponse.redirect(`${base}/settings?google=connected`);
  } catch { return NextResponse.redirect(`${base}/settings?google=error`); }
}

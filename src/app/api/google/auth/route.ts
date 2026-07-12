// @ts-nocheck
import { NextResponse } from "next/server";
import { requireApprovedUser } from "@/lib/api-guards";
import { getGoogleAuthUrl } from "@/lib/google-oauth";
import { signSession } from "@/lib/auth";
export async function GET() {
  const { user, error } = await requireApprovedUser();
  if (error) return error;
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET)
    return NextResponse.json({ error: "Google OAuth not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file." }, { status: 400 });
  const state = await signSession(user!.id);
  return NextResponse.redirect(getGoogleAuthUrl(state));
}

// @ts-nocheck
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userPreferences } from "@/lib/db/schema";
import { requireApprovedUser } from "@/lib/api-guards";

export async function GET() {
  const { user, error } = await requireApprovedUser();
  if (error) return error;
  const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, user.id)).limit(1);
  return NextResponse.json({ judgeProvider: prefs?.judgeProvider || "GOOGLE", judgeModel: prefs?.judgeModel || "gemini-2.5-flash", preferenceProfile: prefs?.preferenceProfile || null, totalChoices: parseInt(prefs?.totalChoices || "0") });
}

export async function PATCH(req) {
  const { user, error } = await requireApprovedUser();
  if (error) return error;
  const { judgeProvider, judgeModel } = await req.json();
  const [existing] = await db.select().from(userPreferences).where(eq(userPreferences.userId, user.id)).limit(1);
  if (existing) await db.update(userPreferences).set({ judgeProvider, judgeModel, updatedAt: new Date() }).where(eq(userPreferences.userId, user.id));
  else await db.insert(userPreferences).values({ userId: user.id, judgeProvider, judgeModel });
  return NextResponse.json({ ok: true });
}

// @ts-nocheck
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userChoices, userPreferences } from "@/lib/db/schema";
import { requireApprovedUser } from "@/lib/api-guards";

export async function POST(req) {
  const { user, error } = await requireApprovedUser();
  if (error) return error;
  const { chosenProvider, chosenModel, rejectedProvider, rejectedModel, prompt, conversationId } = await req.json();
  await db.insert(userChoices).values({ userId: user.id, chosenProvider, chosenModel, rejectedProvider, rejectedModel, prompt, conversationId });
  const choices = await db.select().from(userChoices).where(eq(userChoices.userId, user.id));
  const total = choices.length;
  const providerCounts = {};
  for (const c of choices) providerCounts[c.chosenProvider] = (providerCounts[c.chosenProvider] || 0) + 1;
  const topProvider = Object.entries(providerCounts).sort((a,b) => b[1]-a[1])[0];
  let profile = total >= 3 ? "Based on " + total + " past choices, this user prefers " + (topProvider?.[0] || "any") + " responses. Match this style." : "";
  const [existing] = await db.select().from(userPreferences).where(eq(userPreferences.userId, user.id)).limit(1);
  if (existing) await db.update(userPreferences).set({ preferenceProfile: profile, totalChoices: String(total), updatedAt: new Date() }).where(eq(userPreferences.userId, user.id));
  else await db.insert(userPreferences).values({ userId: user.id, preferenceProfile: profile, totalChoices: String(total) });
  return NextResponse.json({ ok: true, totalChoices: total });
}

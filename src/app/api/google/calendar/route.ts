// @ts-nocheck
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { requireApprovedUser } from "@/lib/api-guards";
import { getValidAccessToken, fetchCalendarEvents } from "@/lib/google-oauth";
export async function GET(req: NextRequest) {
  const { user, error } = await requireApprovedUser();
  if (error) return error;
  const token = await getValidAccessToken(user!.id);
  if (!token) return NextResponse.json({ error: "Google not connected." }, { status: 401 });
  const days = parseInt(new URL(req.url).searchParams.get("days") ?? "7");
  const now = new Date(); const end = new Date(now.getTime() + days * 86400000);
  const events = await fetchCalendarEvents(token, now.toISOString(), end.toISOString());
  if (!events) return NextResponse.json({ error: "Failed to fetch." }, { status: 500 });
  return NextResponse.json({ events: events.map((e) => ({ id: e.id, title: e.summary, description: e.description, start: e.start.dateTime ?? e.start.date, end: e.end.dateTime ?? e.end.date, location: e.location, allDay: !e.start.dateTime })) });
}

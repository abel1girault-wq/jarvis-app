import { eq } from "drizzle-orm";
import { db } from "./db";
import { googleTokens } from "./db/schema";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
  "https://www.googleapis.com/auth/classroom.announcements.readonly",
].join(" ");

export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: `${process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000"}/api/google/callback`,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeCodeForTokens(code: string) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: `${process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000"}/api/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error("Failed to exchange Google auth code.");
  return res.json() as Promise<{ access_token: string; refresh_token?: string; expires_in: number; id_token?: string }>;
}

export async function refreshAccessToken(refreshToken: string) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error("Failed to refresh Google token.");
  return res.json() as Promise<{ access_token: string; expires_in: number }>;
}

export async function getGoogleUserInfo(accessToken: string) {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return res.json() as Promise<{ email: string; name: string }>;
}

export async function getValidAccessToken(userId: string): Promise<string | null> {
  const [token] = await db.select().from(googleTokens).where(eq(googleTokens.userId, userId)).limit(1);
  if (!token) return null;

  // Still valid with 5 min buffer
  if (token.expiresAt.getTime() > Date.now() + 5 * 60 * 1000) {
    return token.accessToken;
  }

  // Try to refresh
  if (!token.refreshToken) return null;
  try {
    const refreshed = await refreshAccessToken(token.refreshToken);
    const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
    await db.update(googleTokens).set({ accessToken: refreshed.access_token, expiresAt, updatedAt: new Date() }).where(eq(googleTokens.userId, userId));
    return refreshed.access_token;
  } catch {
    return null;
  }
}

export async function fetchCalendarEvents(accessToken: string, timeMin: string, timeMax: string) {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "20",
  });
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.items as Array<{
    id: string; summary: string; description?: string;
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
    location?: string;
  }>;
}

export async function fetchClassroomCourses(accessToken: string) {
  const res = await fetch("https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE&pageSize=20", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.courses as Array<{ id: string; name: string; section?: string; room?: string; teacherGroupEmail?: string }>;
}

export async function fetchClassroomAssignments(accessToken: string, courseId: string) {
  const res = await fetch(
    `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork?orderBy=dueDate+desc&pageSize=10`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.courseWork as Array<{
    id: string; title: string; description?: string;
    dueDate?: { year: number; month: number; day: number };
    dueTime?: { hours: number; minutes: number };
    maxPoints?: number; state: string;
  }>;
}

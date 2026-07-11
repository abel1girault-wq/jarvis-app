import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "./lib/session-constants";

const PROTECTED = ["/chat", "/settings", "/admin", "/study"];
const AUTH_PAGES = ["/login", "/register"];

async function hasSession(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const s = process.env.JWT_SECRET;
  if (!s) return false;
  try { await jwtVerify(token, new TextEncoder().encode(s)); return true; } catch { return false; }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const loggedIn = await hasSession(req);
  if (PROTECTED.some((p) => pathname.startsWith(p)) && !loggedIn) return NextResponse.redirect(new URL("/login", req.url));
  if (AUTH_PAGES.some((p) => pathname.startsWith(p)) && loggedIn) return NextResponse.redirect(new URL("/chat", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/chat/:path*", "/settings/:path*", "/admin/:path*", "/study/:path*", "/login", "/register"],
};

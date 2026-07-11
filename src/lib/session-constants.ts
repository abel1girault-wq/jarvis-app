export const SESSION_COOKIE = "jarvis_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;
export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_DURATION_SECONDS,
};

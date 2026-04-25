import { NextResponse } from "next/server";
import { consumeMagicToken, createSession } from "@/lib/db/tokens";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const appUrl = process.env.APP_URL ?? "https://oche.cloud";

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=invalid", appUrl));
  }

  const userId = await consumeMagicToken(token);
  if (!userId) {
    return NextResponse.redirect(new URL("/login?error=expired", appUrl));
  }

  const sessionId = await createSession(userId);
  const isHttps = appUrl.startsWith("https://");

  const response = NextResponse.redirect(new URL("/play", appUrl));
  response.cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return response;
}

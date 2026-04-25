import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSession } from "@/lib/db/tokens";
import { SESSION_COOKIE } from "@/lib/auth";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionId) {
    await deleteSession(sessionId).catch(() => {}); // best-effort
  }

  const appUrl = process.env.APP_URL ?? "https://oche.cloud";
  const response = NextResponse.redirect(new URL("/login", appUrl));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

// lib/auth.ts — server-side session helpers (Server Components / Route Handlers only)
import { cookies } from "next/headers";
import { getSession } from "@/lib/db/tokens";
import { getUserById } from "@/lib/db/users";
import type { User } from "@/lib/types";

export const SESSION_COOKIE = "oche_session";
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
    if (!sessionId) return null;

    const session = await getSession(sessionId);
    if (!session) return null;

    return getUserById(session.userId);
  } catch (err) {
    console.error("[getCurrentUser] error:", err);
    return null;
  }
}

import { NextResponse } from "next/server";
import { findOrCreateUser } from "@/lib/db/users";
import { countRecentMagicTokens, createMagicToken } from "@/lib/db/tokens";
import { sendMagicLink } from "@/lib/email";

const RATE_LIMIT_WINDOW_MINUTES = 5;
const RATE_LIMIT_MAX = 3;

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const normalised = email.trim().toLowerCase();
    const user = await findOrCreateUser(normalised);

    // Cap magic-link emails to RATE_LIMIT_MAX per user per window. Silent reject
    // (still 200) so we don't leak that the cap was hit and stay consistent with
    // the existing "don't reveal whether the email exists" behaviour.
    const recent = await countRecentMagicTokens(user.id, RATE_LIMIT_WINDOW_MINUTES);
    if (recent >= RATE_LIMIT_MAX) {
      console.warn(`[auth/request] rate-limited ${normalised} (${recent} recent tokens)`);
      return NextResponse.json({ ok: true });
    }

    const rawToken = await createMagicToken(user.id);
    const appUrl = process.env.APP_URL ?? "https://oche.cloud";
    const verifyUrl = `${appUrl}/api/auth/verify?token=${rawToken}`;

    await sendMagicLink(normalised, verifyUrl);

    // Always return 200 — don't reveal whether the email exists
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[auth/request]", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

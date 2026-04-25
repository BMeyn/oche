import { NextResponse } from "next/server";
import { findOrCreateUser } from "@/lib/db/users";
import { createMagicToken } from "@/lib/db/tokens";
import { sendMagicLink } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const normalised = email.trim().toLowerCase();
    const user = await findOrCreateUser(normalised);
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

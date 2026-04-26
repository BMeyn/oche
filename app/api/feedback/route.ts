import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, message } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: "Message required" }, { status: 400 });

  const label = type === "bug" ? "Bug report" : "Feature request";

  console.log(`[feedback] ${label} from ${user.email}:\n${message}`);

  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const domain = process.env.RESEND_FROM_DOMAIN ?? "contact.oche.cloud";
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `OCHE Feedback <noreply@${domain}>`,
        to: "bjarne.meyn@icloud.com",
        subject: `[OCHE] ${label} from ${user.email}`,
        text: `From: ${user.email}\nType: ${label}\n\n${message}`,
      }),
    });
  }

  return NextResponse.json({ ok: true });
}

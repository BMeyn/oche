import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getFriends, getPendingRequests, sendFriendRequest } from "@/lib/db/friends";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [friends, requests] = await Promise.all([
    getFriends(user.id),
    getPendingRequests(user.id),
  ]);

  return NextResponse.json({ friends, requests });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  try {
    await sendFriendRequest(user.id, email);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

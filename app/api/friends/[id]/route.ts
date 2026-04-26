import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { respondToRequest, removeFriend, cancelRequest } from "@/lib/db/friends";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const requestId = Number(id);
  if (!requestId) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const action = body.action as string;
  if (action !== "accept" && action !== "decline") {
    return NextResponse.json({ error: "action must be accept or decline" }, { status: 400 });
  }

  try {
    await respondToRequest(requestId, user.id, action);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const requestId = Number(id);
  if (!requestId) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  // Try cancel (outgoing pending) first, then remove friend (accepted)
  const body = await req.json().catch(() => ({}));
  const friendId = typeof body.friendId === "number" ? body.friendId : null;

  try {
    if (friendId !== null) {
      await removeFriend(user.id, friendId);
    } else {
      await cancelRequest(requestId, user.id);
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

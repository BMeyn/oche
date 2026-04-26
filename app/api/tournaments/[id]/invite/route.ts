import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { invitePlayerToTournament, getTournament } from "@/lib/db/tournaments";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const inviteeId = typeof body.userId === "number" ? body.userId : null;
  if (!inviteeId) return NextResponse.json({ error: "Invalid userId" }, { status: 400 });

  try {
    await invitePlayerToTournament(id, user.id, inviteeId);
    const t = await getTournament(id);
    return NextResponse.json(t, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    const status =
      msg === "Tournament is full" ? 409
      : msg === "Not a friend" || msg === "Not the creator" ? 403
      : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

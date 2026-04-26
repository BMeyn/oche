import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { joinTournament, getTournament } from "@/lib/db/tournaments";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await joinTournament(id, user.id);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to join";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const tournament = await getTournament(id);
  return NextResponse.json(tournament);
}

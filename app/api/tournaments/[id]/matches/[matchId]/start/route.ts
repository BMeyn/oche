import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { startTournamentMatch } from "@/lib/db/tournaments";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; matchId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { matchId } = await params;
  try {
    const gameId = await startTournamentMatch(matchId, user.id);
    return NextResponse.json({ gameId });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to start match";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

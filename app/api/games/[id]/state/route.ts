import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getGame, updateGameState } from "@/lib/db/games";
import { finishTournamentMatch } from "@/lib/db/tournaments";
import type { Match } from "@/lib/types";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { match }: { match: Match } = await req.json();
  await updateGameState(id, match);

  if (match.winner !== null) {
    const game = await getGame(id);
    if (game) {
      const winnerUserId = match.winner === 0 ? game.player1Id : game.player2Id;
      if (winnerUserId !== null) {
        await finishTournamentMatch(id, winnerUserId).catch(() => {});
      }
    }
  }

  return NextResponse.json({ ok: true });
}

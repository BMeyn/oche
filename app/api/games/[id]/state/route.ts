import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getGame, updateGameState } from "@/lib/db/games";
import { finishTournamentMatch } from "@/lib/db/tournaments";
import { isValidMatch } from "@/lib/validation";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const body: unknown = await req.json().catch(() => null);
  const match = (body && typeof body === "object" ? (body as { match?: unknown }).match : null);
  if (!isValidMatch(match)) {
    return NextResponse.json({ error: "Invalid match payload" }, { status: 400 });
  }

  const game = await getGame(id);
  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (game.player1Id !== user.id && game.player2Id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await updateGameState(id, match);

  if (match.winner !== null) {
    const winnerUserId = match.winner === 0 ? game.player1Id : game.player2Id;
    if (winnerUserId !== null) {
      await finishTournamentMatch(id, winnerUserId).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true });
}

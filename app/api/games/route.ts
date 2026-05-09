import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createGame, getMyGames, rematchGame } from "@/lib/db/games";
import type { GameConfig } from "@/lib/types";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const games = await getMyGames(user.id);
  return NextResponse.json(games);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as (GameConfig & { guestName?: string }) | { rematchOf: string };

  if ("rematchOf" in body && body.rematchOf) {
    try {
      const game = await rematchGame(user.id, user.email, body.rematchOf);
      return NextResponse.json(game, { status: 201 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Rematch failed";
      const status = msg.includes("not found") ? 404
        : msg.includes("Not a participant") ? 403
        : msg.includes("Training") ? 400
        : 500;
      return NextResponse.json({ error: msg }, { status });
    }
  }

  const { guestName, ...config } = body as GameConfig & { guestName?: string };
  const game = await createGame(user.id, user.email, config as GameConfig, guestName);
  return NextResponse.json(game, { status: 201 });
}

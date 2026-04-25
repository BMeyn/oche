import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createGame, getMyGames } from "@/lib/db/games";
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

  const { guestName, ...config }: GameConfig & { guestName?: string } = await req.json();
  const game = await createGame(user.id, user.email, config as GameConfig, guestName);
  return NextResponse.json(game, { status: 201 });
}

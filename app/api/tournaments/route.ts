import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createTournament, getMyTournaments } from "@/lib/db/tournaments";
import type { GameConfig } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const tournaments = await getMyTournaments(user.id);
    return NextResponse.json(tournaments);
  } catch (e) {
    console.error("[GET /api/tournaments]", e);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, format, maxPlayers, seasonHalves, ...gameConfig }: {
    name: string;
    format: "single_elim" | "round_robin";
    maxPlayers: number;
    seasonHalves?: number;
  } & GameConfig = await req.json();

  const tournament = await createTournament(
    user.id,
    name,
    format,
    gameConfig as GameConfig,
    Math.min(16, Math.max(2, maxPlayers)),
    format === "round_robin" && seasonHalves === 2 ? 2 : 1,
  );
  return NextResponse.json(tournament, { status: 201 });
}

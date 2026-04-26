import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { startTournament } from "@/lib/db/tournaments";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const tournament = await startTournament(id, user.id);
    return NextResponse.json(tournament);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to start";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

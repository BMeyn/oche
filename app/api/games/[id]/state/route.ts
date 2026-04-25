import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateGameState } from "@/lib/db/games";
import type { Match } from "@/lib/types";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { match }: { match: Match } = await req.json();
  await updateGameState(id, match);
  return NextResponse.json({ ok: true });
}

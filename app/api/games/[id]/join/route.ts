import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { joinGame } from "@/lib/db/games";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const game = await joinGame(id, { id: user.id, email: user.email });
    return NextResponse.json(game);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to join";
    return NextResponse.json({ error: msg }, { status: 409 });
  }
}

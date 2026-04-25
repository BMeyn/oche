import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getGame, deleteGame } from "@/lib/db/games";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const game = await getGame(id);
  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(game);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const deleted = await deleteGame(id, user.id);
  if (!deleted) return NextResponse.json({ error: "Not found or not allowed" }, { status: 404 });

  return new NextResponse(null, { status: 204 });
}

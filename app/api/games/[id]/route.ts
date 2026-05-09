import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getGame, getGameVersion, deleteGame } from "@/lib/db/games";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const version = await getGameVersion(id);
  if (version === null) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ifNoneMatch = req.headers.get("if-none-match");
  if (ifNoneMatch && ifNoneMatch === version) {
    return new NextResponse(null, { status: 304, headers: { ETag: version } });
  }

  const game = await getGame(id);
  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(game, { headers: { ETag: version } });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const deleted = await deleteGame(id, user.id);
  if (!deleted) return NextResponse.json({ error: "Not found or not allowed" }, { status: 404 });

  return new NextResponse(null, { status: 204 });
}

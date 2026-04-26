import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getTournament, deleteTournament } from "@/lib/db/tournaments";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const tournament = await getTournament(id);
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(tournament);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await deleteTournament(id, user.id);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Not found or not authorized" }, { status: 403 });
  }
}

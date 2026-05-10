import { NextResponse } from "next/server";
import { pruneStaleGames } from "@/lib/db/games";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "cron not configured" }, { status: 503 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await pruneStaleGames();
  return NextResponse.json(result);
}

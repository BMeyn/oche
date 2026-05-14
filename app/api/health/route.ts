import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import pkg from "@/package.json";

export const dynamic = "force-dynamic";

const VERSION = pkg.version;
const DB_TIMEOUT_MS = 2000;
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    if (!sql) throw new Error("Database not configured");

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error("DB query timed out after 2s")),
        DB_TIMEOUT_MS,
      );
    });

    try {
      await Promise.race([sql`SELECT 1 as ok`, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }

    return NextResponse.json(
      { status: "ok", version: VERSION, db: "up", uptime: process.uptime() },
      { headers: NO_STORE },
    );
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const safe = raw.slice(0, 200);
    return NextResponse.json(
      { status: "degraded", version: VERSION, db: "down", error: safe },
      { status: 503, headers: NO_STORE },
    );
  }
}

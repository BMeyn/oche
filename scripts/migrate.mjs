#!/usr/bin/env node
// scripts/migrate.mjs
//
// Placeholder migration runner. V1 has no schema (no persistence yet).
// When match persistence is added in Phase 3, drop SQL files into
// lib/db/migrations/ and this script will apply them in order.

import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "..", "lib", "db", "migrations");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = postgres(url);

try {
  await sql`
    CREATE TABLE IF NOT EXISTS migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  let files = [];
  try {
    files = (await readdir(migrationsDir))
      .filter((f) => f.endsWith(".sql"))
      .sort();
  } catch {
    console.log("No migrations directory yet — nothing to apply.");
    process.exit(0);
  }

  if (files.length === 0) {
    console.log("No migrations to apply.");
    process.exit(0);
  }

  const applied = await sql`SELECT name FROM migrations`;
  const appliedSet = new Set(applied.map((r) => r.name));

  for (const f of files) {
    if (appliedSet.has(f)) {
      console.log(`✓ already applied: ${f}`);
      continue;
    }
    const sqlText = await readFile(join(migrationsDir, f), "utf8");
    console.log(`→ applying: ${f}`);
    await sql.unsafe(sqlText);
    await sql`INSERT INTO migrations (name) VALUES (${f})`;
    console.log(`✓ applied: ${f}`);
  }
  console.log("Done.");
} catch (err) {
  console.error("Migration failed:", err);
  process.exit(1);
} finally {
  await sql.end();
}

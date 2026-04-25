import { randomBytes, createHash } from "node:crypto";
import { sql } from "@/lib/db";
import type { Session } from "@/lib/types";

function requireSql() {
  if (!sql) throw new Error("DATABASE_URL is not configured");
  return sql;
}

function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Returns the raw (unhashed) token to embed in the email link.
export async function createMagicToken(userId: number): Promise<string> {
  const db = requireSql();
  const raw = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  await db`
    INSERT INTO magic_tokens (user_id, token_hash, expires_at)
    VALUES (${userId}, ${hashToken(raw)}, ${expiresAt})
  `;
  return raw;
}

// Validates token, marks it used, returns user_id — or null if invalid/expired.
export async function consumeMagicToken(raw: string): Promise<number | null> {
  const db = requireSql();
  const hash = hashToken(raw);
  const [row] = await db`
    UPDATE magic_tokens
    SET used_at = now()
    WHERE token_hash = ${hash}
      AND used_at IS NULL
      AND expires_at > now()
    RETURNING user_id
  `;
  if (!row) return null;
  return Number(row.user_id);
}

export async function createSession(userId: number): Promise<string> {
  const db = requireSql();
  const id = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (${id}, ${userId}, ${expiresAt})
  `;
  return id;
}

export async function getSession(id: string): Promise<Session | null> {
  const db = requireSql();
  const [row] = await db`
    SELECT id, user_id, expires_at FROM sessions
    WHERE id = ${id} AND expires_at > now()
  `;
  if (!row) return null;
  return { id: row.id, userId: Number(row.user_id), expiresAt: row.expires_at };
}

export async function deleteSession(id: string): Promise<void> {
  const db = requireSql();
  await db`DELETE FROM sessions WHERE id = ${id}`;
}

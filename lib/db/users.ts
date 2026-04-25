import { sql } from "@/lib/db";
import type { User } from "@/lib/types";

function requireSql() {
  if (!sql) throw new Error("DATABASE_URL is not configured");
  return sql;
}

export async function findOrCreateUser(email: string): Promise<User> {
  const db = requireSql();
  const [row] = await db`
    INSERT INTO users (email)
    VALUES (${email})
    ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
    RETURNING id, email, created_at
  `;
  return { id: Number(row.id), email: row.email, createdAt: row.created_at };
}

export async function getUserById(id: number): Promise<User | null> {
  const db = requireSql();
  const [row] = await db`
    SELECT id, email, created_at FROM users WHERE id = ${id}
  `;
  if (!row) return null;
  return { id: Number(row.id), email: row.email, createdAt: row.created_at };
}

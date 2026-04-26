import { sql } from "@/lib/db";
import type { User } from "@/lib/types";

function requireSql() {
  if (!sql) throw new Error("DATABASE_URL is not configured");
  return sql;
}

function rowToUser(row: Record<string, unknown>): User {
  return {
    id: Number(row.id),
    email: row.email as string,
    displayName: (row.display_name as string | null) ?? null,
    avatarColor: (row.avatar_color as string) ?? "#6d736f",
    createdAt: row.created_at as Date,
  };
}

export async function findOrCreateUser(email: string): Promise<User> {
  const db = requireSql();
  const [row] = await db`
    INSERT INTO users (email)
    VALUES (${email})
    ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
    RETURNING id, email, display_name, avatar_color, created_at
  `;
  return rowToUser(row);
}

export async function getUserById(id: number): Promise<User | null> {
  const db = requireSql();
  const [row] = await db`
    SELECT id, email, display_name, avatar_color, created_at FROM users WHERE id = ${id}
  `;
  if (!row) return null;
  return rowToUser(row);
}

export async function updateProfile(
  userId: number,
  { displayName, avatarColor }: { displayName?: string; avatarColor?: string },
): Promise<User> {
  const db = requireSql();
  const [row] = await db`
    UPDATE users
    SET
      display_name = COALESCE(${displayName ?? null}, display_name),
      avatar_color = COALESCE(${avatarColor ?? null}, avatar_color)
    WHERE id = ${userId}
    RETURNING id, email, display_name, avatar_color, created_at
  `;
  return rowToUser(row);
}

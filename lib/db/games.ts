import { createHash } from "node:crypto";
import { sql } from "@/lib/db";
import { createMatch } from "@/lib/scoring";
import type { Game, GameConfig, Match } from "@/lib/types";
import { displayName } from "@/lib/display";

function requireSql() {
  if (!sql) throw new Error("DATABASE_URL is not configured");
  return sql;
}

function rowToGame(row: Record<string, unknown>): Game {
  return {
    id: row.id as string,
    status: row.status as Game["status"],
    config: row.config as GameConfig,
    player1Id: Number(row.player1_id),
    player1Email: row.player1_email as string,
    player2Id: row.player2_id ? Number(row.player2_id) : null,
    player2Email: row.player2_email as string | null,
    matchState: row.match_state ? (row.match_state as Match) : null,
    createdAt: row.created_at as Date,
    startedAt: row.started_at ? (row.started_at as Date) : null,
    finishedAt: row.finished_at ? (row.finished_at as Date) : null,
  };
}

export async function createGame(
  userId: number,
  player1Email: string,
  config: GameConfig,
  guestName?: string,
): Promise<Game> {
  const db = requireSql();

  const isTraining = config.mode === "training";
  if (guestName || isTraining) {
    const [p1row] = await db`SELECT display_name FROM users WHERE id = ${userId}`;
    const matchConfig = {
      ...config,
      players: [
        displayName(player1Email, p1row?.display_name as string | null),
        isTraining ? "" : guestName!.trim(),
      ] as [string, string],
    };
    const initialMatch = createMatch(matchConfig);
    const [row] = await db`
      INSERT INTO games (config, player1_id, status, started_at, match_state)
      VALUES (${db.json(config as never)}, ${userId}, 'active', now(), ${db.json(initialMatch as never)})
      RETURNING
        id, status, config, player1_id, player2_id, match_state,
        created_at, started_at, finished_at,
        (SELECT email FROM users WHERE id = player1_id) AS player1_email,
        NULL::text AS player2_email
    `;
    return rowToGame(row);
  }

  const [row] = await db`
    INSERT INTO games (config, player1_id)
    VALUES (${db.json(config as never)}, ${userId})
    RETURNING
      id, status, config, player1_id, player2_id, match_state,
      created_at, started_at, finished_at,
      (SELECT email FROM users WHERE id = player1_id) AS player1_email,
      NULL::text AS player2_email
  `;
  return rowToGame(row);
}

export async function rematchGame(
  userId: number,
  userEmail: string,
  originalGameId: string,
): Promise<Game> {
  const db = requireSql();
  const [row] = await db`
    SELECT g.config, g.player1_id, g.player2_id, g.match_state
    FROM games g
    WHERE g.id = ${originalGameId}
  `;
  if (!row) throw new Error("Original game not found");

  const player1Id = Number(row.player1_id);
  const player2Id = row.player2_id ? Number(row.player2_id) : null;
  if (player1Id !== userId && player2Id !== userId) {
    throw new Error("Not a participant in original game");
  }

  const config = row.config as GameConfig;
  if (config.mode === "training") throw new Error("Training games cannot be rematched");

  if (player2Id === null) {
    const matchState = row.match_state as Match | null;
    const guestName = matchState?.config.players[1]?.trim() || "Guest";
    return createGame(userId, userEmail, config, guestName);
  }

  return createGame(userId, userEmail, config);
}

export async function joinGame(gameId: string, player2: { id: number; email: string }): Promise<Game> {
  const db = requireSql();

  // Fetch player1 email and config in one query, also lock the row
  const [existing] = await db`
    SELECT g.config, u.email AS player1_email, u.display_name AS player1_display_name
    FROM games g
    JOIN users u ON u.id = g.player1_id
    WHERE g.id = ${gameId} AND g.status = 'waiting'
    FOR UPDATE
  `;
  if (!existing) throw new Error("Game not found or already started");

  const config = existing.config as GameConfig;
  const [p2row] = await db`SELECT display_name FROM users WHERE id = ${player2.id}`;
  const matchConfig = {
    ...config,
    players: [
      displayName(existing.player1_email as string, existing.player1_display_name as string | null),
      displayName(player2.email, p2row?.display_name as string | null),
    ] as [string, string],
  };
  const initialMatch = createMatch(matchConfig);

  const [row] = await db`
    UPDATE games
    SET
      player2_id  = ${player2.id},
      status      = 'active',
      started_at  = now(),
      match_state = ${db.json(initialMatch as never)}
    WHERE id = ${gameId}
    RETURNING
      id, status, config, player1_id, player2_id, match_state,
      created_at, started_at, finished_at,
      (SELECT email FROM users WHERE id = player1_id) AS player1_email,
      ${player2.email} AS player2_email
  `;
  return rowToGame(row);
}

export async function getGame(id: string): Promise<Game | null> {
  const db = requireSql();
  const [row] = await db`
    SELECT
      g.id, g.status, g.config, g.player1_id, g.player2_id, g.match_state,
      g.created_at, g.started_at, g.finished_at,
      u1.email AS player1_email,
      u2.email AS player2_email
    FROM games g
    JOIN users u1 ON u1.id = g.player1_id
    LEFT JOIN users u2 ON u2.id = g.player2_id
    WHERE g.id = ${id}
  `;
  if (!row) return null;
  return rowToGame(row);
}

export interface GameVersion {
  version: string;
  status: Game["status"];
  player1Id: number;
  player2Id: number | null;
}

export async function getGameVersion(id: string): Promise<GameVersion | null> {
  const db = requireSql();
  const [row] = await db`
    SELECT
      g.status,
      g.player1_id,
      g.player2_id,
      g.started_at,
      g.finished_at,
      g.match_state->'currentLeg'->>'currentPlayer' AS current_player,
      jsonb_array_length(COALESCE(g.match_state->'legHistory', '[]'::jsonb)) AS leg_count,
      jsonb_array_length(COALESCE(g.match_state->'currentLeg'->'currentTurnDarts', '[]'::jsonb)) AS dart_count
    FROM games g
    WHERE g.id = ${id}
  `;
  if (!row) return null;
  const startedAt = row.started_at instanceof Date ? row.started_at.toISOString() : "";
  const finishedAt = row.finished_at instanceof Date ? row.finished_at.toISOString() : "";
  const raw = `${row.status}|${startedAt}|${finishedAt}|${row.current_player ?? ""}|${row.leg_count ?? 0}|${row.dart_count ?? 0}`;
  return {
    version: createHash("sha1").update(raw).digest("hex").slice(0, 12),
    status: row.status as Game["status"],
    player1Id: Number(row.player1_id),
    player2Id: row.player2_id ? Number(row.player2_id) : null,
  };
}

export async function getMyGamesVersion(userId: number): Promise<string> {
  const db = requireSql();
  const rows = await db`
    SELECT g.id, g.status, g.finished_at
    FROM games g
    WHERE g.status != 'finished'
      AND (g.player1_id = ${userId} OR g.player2_id = ${userId})
    ORDER BY g.id
  `;
  const raw = rows
    .map((r) => `${r.id}|${r.status}|${r.finished_at instanceof Date ? r.finished_at.toISOString() : ""}`)
    .join(";");
  return createHash("sha1").update(raw).digest("hex").slice(0, 12);
}

export async function getOpenGames(): Promise<Game[]> {
  const db = requireSql();
  const rows = await db`
    SELECT
      g.id, g.status, g.config, g.player1_id, g.player2_id, g.match_state,
      g.created_at, g.started_at, g.finished_at,
      u1.email AS player1_email,
      NULL::text AS player2_email
    FROM games g
    JOIN users u1 ON u1.id = g.player1_id
    WHERE g.status = 'waiting'
    ORDER BY g.created_at DESC
    LIMIT 20
  `;
  return rows.map(rowToGame);
}

export async function getMyGames(userId: number): Promise<Game[]> {
  const db = requireSql();
  const rows = await db`
    SELECT
      g.id, g.status, g.config, g.player1_id, g.player2_id, g.match_state,
      g.created_at, g.started_at, g.finished_at,
      u1.email AS player1_email,
      u2.email AS player2_email
    FROM games g
    JOIN users u1 ON u1.id = g.player1_id
    LEFT JOIN users u2 ON u2.id = g.player2_id
    WHERE g.status != 'finished'
      AND (g.player1_id = ${userId} OR g.player2_id = ${userId})
    ORDER BY g.created_at DESC
    LIMIT 10
  `;
  return rows.map(rowToGame);
}

export async function deleteGame(id: string, userId: number): Promise<boolean> {
  const db = requireSql();
  const result = await db`
    DELETE FROM games
    WHERE id = ${id}
      AND (player1_id = ${userId} OR player2_id = ${userId})
      AND status != 'finished'
  `;
  return result.count > 0;
}

export async function updateGameState(id: string, match: Match): Promise<void> {
  const db = requireSql();
  const finished = match.winner !== null;
  await db`
    UPDATE games
    SET
      match_state = ${db.json(match as never)},
      status      = ${finished ? "finished" : "active"},
      finished_at = ${finished ? db`now()` : db`NULL`}
    WHERE id = ${id}
  `;
}

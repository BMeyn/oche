import { sql } from "@/lib/db";
import { createMatch } from "@/lib/scoring";
import type { GameConfig, Tournament, TournamentMatch, TournamentPlayer } from "@/lib/types";
import {
  generateMatches,
  getAdvancementSlot,
  type MatchSpec,
} from "@/lib/tournament";
import { displayName } from "@/lib/display";

function requireSql() {
  if (!sql) throw new Error("DATABASE_URL is not configured");
  return sql;
}

function rowToPlayer(row: Record<string, unknown>): TournamentPlayer {
  return {
    userId: Number(row.user_id),
    email: row.email as string,
    displayName: (row.display_name as string | null) ?? null,
    seed: row.seed !== null ? Number(row.seed) : null,
    joinedAt: row.joined_at as Date,
  };
}

function rowToMatch(row: Record<string, unknown>): TournamentMatch {
  return {
    id: row.id as string,
    tournamentId: row.tournament_id as string,
    gameId: row.game_id ? (row.game_id as string) : null,
    round: Number(row.round),
    matchNumber: Number(row.match_number),
    player1Id: row.player1_id ? Number(row.player1_id) : null,
    player1Email: row.player1_email ? (row.player1_email as string) : null,
    player2Id: row.player2_id ? Number(row.player2_id) : null,
    player2Email: row.player2_email ? (row.player2_email as string) : null,
    winnerId: row.winner_id ? Number(row.winner_id) : null,
    status: row.status as TournamentMatch["status"],
  };
}

function rowToTournament(
  row: Record<string, unknown>,
  players: TournamentPlayer[],
  matches: TournamentMatch[],
): Tournament {
  return {
    id: row.id as string,
    name: row.name as string,
    status: row.status as Tournament["status"],
    format: row.format as Tournament["format"],
    gameConfig: row.game_config as GameConfig,
    creatorId: Number(row.creator_id),
    maxPlayers: Number(row.max_players),
    seasonHalves: Number(row.season_halves) || 1,
    createdAt: row.created_at as Date,
    startedAt: row.started_at ? (row.started_at as Date) : null,
    finishedAt: row.finished_at ? (row.finished_at as Date) : null,
    players,
    matches,
  };
}

export async function createTournament(
  creatorId: number,
  name: string,
  format: Tournament["format"],
  gameConfig: GameConfig,
  maxPlayers: number,
  seasonHalves: number,
): Promise<Tournament> {
  const db = requireSql();

  const [row] = await db`
    INSERT INTO tournaments (name, format, game_config, creator_id, max_players, season_halves)
    VALUES (${name}, ${format}, ${db.json(gameConfig as never)}, ${creatorId}, ${maxPlayers}, ${seasonHalves})
    RETURNING id, name, status, format, game_config, creator_id, max_players, season_halves,
              created_at, started_at, finished_at
  `;

  // Creator auto-joins
  await db`
    INSERT INTO tournament_players (tournament_id, user_id)
    VALUES (${row.id as string}, ${creatorId})
  `;

  const [creatorRow] = await db`
    SELECT email, display_name FROM users WHERE id = ${creatorId}
  `;

  const player: TournamentPlayer = {
    userId: creatorId,
    email: creatorRow.email as string,
    displayName: (creatorRow.display_name as string | null) ?? null,
    seed: null,
    joinedAt: new Date(),
  };

  return rowToTournament(row, [player], []);
}

export async function joinTournament(
  tournamentId: string,
  userId: number,
): Promise<void> {
  const db = requireSql();

  // Lock the tournament row, then check status and player count separately
  const [tournament] = await db`
    SELECT id, status, max_players FROM tournaments
    WHERE id = ${tournamentId}
    FOR UPDATE
  `;
  if (!tournament) throw new Error("Tournament not found");
  if (tournament.status !== "waiting") throw new Error("Tournament already started");

  const [{ player_count }] = await db`
    SELECT COUNT(*) AS player_count FROM tournament_players
    WHERE tournament_id = ${tournamentId}
  `;
  if (Number(player_count) >= Number(tournament.max_players)) {
    throw new Error("Tournament is full");
  }

  await db`
    INSERT INTO tournament_players (tournament_id, user_id)
    VALUES (${tournamentId}, ${userId})
    ON CONFLICT DO NOTHING
  `;
}

export async function invitePlayerToTournament(
  tournamentId: string,
  creatorId: number,
  inviteeId: number,
): Promise<void> {
  const db = requireSql();

  const [tournament] = await db`
    SELECT id, status, max_players, creator_id FROM tournaments
    WHERE id = ${tournamentId}
    FOR UPDATE
  `;
  if (!tournament) throw new Error("Tournament not found");
  if (Number(tournament.creator_id) !== creatorId) throw new Error("Not the creator");
  if (tournament.status !== "waiting") throw new Error("Tournament already started");

  const [{ player_count }] = await db`
    SELECT COUNT(*) AS player_count FROM tournament_players
    WHERE tournament_id = ${tournamentId}
  `;
  if (Number(player_count) >= Number(tournament.max_players)) {
    throw new Error("Tournament is full");
  }

  const [friendship] = await db`
    SELECT id FROM friend_requests
    WHERE status = 'accepted'
      AND ((requester_id = ${creatorId} AND addressee_id = ${inviteeId})
        OR (requester_id = ${inviteeId} AND addressee_id = ${creatorId}))
  `;
  if (!friendship) throw new Error("Not a friend");

  await db`
    INSERT INTO tournament_players (tournament_id, user_id)
    VALUES (${tournamentId}, ${inviteeId})
    ON CONFLICT DO NOTHING
  `;
}

export async function startTournament(
  tournamentId: string,
  creatorId: number,
): Promise<Tournament> {
  const db = requireSql();

  return await db.begin(async (tx) => {
    // Lock and validate
    const [tournament] = await tx`
      SELECT * FROM tournaments
      WHERE id = ${tournamentId} AND creator_id = ${creatorId} AND status = 'waiting'
      FOR UPDATE
    `;
    if (!tournament) throw new Error("Tournament not found or not authorised");

    const playerRows = await tx`
      SELECT tp.user_id, tp.seed, tp.joined_at, u.email, u.display_name
      FROM tournament_players tp
      JOIN users u ON u.id = tp.user_id
      WHERE tp.tournament_id = ${tournamentId}
      ORDER BY tp.joined_at ASC
    `;
    if (playerRows.length < 2) throw new Error("Need at least 2 players to start");

    // Shuffle and assign seeds
    const shuffled = [...playerRows].sort(() => Math.random() - 0.5);
    const players: TournamentPlayer[] = shuffled.map((r, i) => ({
      userId: Number(r.user_id),
      email: r.email as string,
      displayName: (r.display_name as string | null) ?? null,
      seed: i + 1,
      joinedAt: r.joined_at as Date,
    }));

    // Update seeds in DB
    for (const p of players) {
      await tx`
        UPDATE tournament_players
        SET seed = ${p.seed}
        WHERE tournament_id = ${tournamentId} AND user_id = ${p.userId}
      `;
    }

    // Generate match specs
    const specs: MatchSpec[] = generateMatches(
      players,
      tournament.format as Tournament["format"],
      Number(tournament.season_halves) || 1,
    );

    // Insert matches and resolve byes immediately
    for (const spec of specs) {
      await tx`
        INSERT INTO tournament_matches
          (tournament_id, round, match_number, player1_id, player2_id, status)
        VALUES
          (${tournamentId}, ${spec.round}, ${spec.matchNumber},
           ${spec.player1Id}, ${spec.player2Id}, ${spec.status})
      `;
    }

    // Resolve byes: winner = the non-null player; advance them
    const byeSpecs = specs.filter((s) => s.status === "bye");
    for (const byeSpec of byeSpecs) {
      const winnerId = byeSpec.player1Id ?? byeSpec.player2Id;
      if (winnerId === null) continue;

      await tx`
        UPDATE tournament_matches
        SET winner_id = ${winnerId}, status = 'bye'
        WHERE tournament_id = ${tournamentId}
          AND round = ${byeSpec.round}
          AND match_number = ${byeSpec.matchNumber}
      `;

      // Advance winner to next round
      if (tournament.format === "single_elim") {
        const adv = getAdvancementSlot(byeSpec.round, byeSpec.matchNumber);
        if (adv.slot === "player1") {
          await tx`
            UPDATE tournament_matches
            SET player1_id = ${winnerId}, status = CASE
              WHEN player2_id IS NOT NULL THEN 'ready'
              ELSE 'pending'
            END
            WHERE tournament_id = ${tournamentId}
              AND round = ${adv.round}
              AND match_number = ${adv.matchNumber}
          `;
        } else {
          await tx`
            UPDATE tournament_matches
            SET player2_id = ${winnerId}, status = CASE
              WHEN player1_id IS NOT NULL THEN 'ready'
              ELSE 'pending'
            END
            WHERE tournament_id = ${tournamentId}
              AND round = ${adv.round}
              AND match_number = ${adv.matchNumber}
          `;
        }
      }
    }

    // Mark tournament active
    const [updated] = await tx`
      UPDATE tournaments
      SET status = 'active', started_at = now()
      WHERE id = ${tournamentId}
      RETURNING id, name, status, format, game_config, creator_id, max_players, season_halves,
                created_at, started_at, finished_at
    `;

    const updatedPlayers = players;
    const matchRows = await tx`
      SELECT
        tm.id, tm.tournament_id, tm.game_id, tm.round, tm.match_number,
        tm.player1_id, tm.player2_id, tm.winner_id, tm.status,
        u1.email AS player1_email, u2.email AS player2_email
      FROM tournament_matches tm
      LEFT JOIN users u1 ON u1.id = tm.player1_id
      LEFT JOIN users u2 ON u2.id = tm.player2_id
      WHERE tm.tournament_id = ${tournamentId}
      ORDER BY tm.round, tm.match_number
    `;

    return rowToTournament(updated, updatedPlayers, matchRows.map(rowToMatch));
  });
}

export async function getTournament(id: string): Promise<Tournament | null> {
  const db = requireSql();

  const [row] = await db`
    SELECT id, name, status, format, game_config, creator_id, max_players, season_halves,
           created_at, started_at, finished_at
    FROM tournaments
    WHERE id = ${id}
  `;
  if (!row) return null;

  const playerRows = await db`
    SELECT tp.user_id, tp.seed, tp.joined_at, u.email
    FROM tournament_players tp
    JOIN users u ON u.id = tp.user_id
    WHERE tp.tournament_id = ${id}
    ORDER BY tp.seed ASC NULLS LAST, tp.joined_at ASC
  `;

  const matchRows = await db`
    SELECT
      tm.id, tm.tournament_id, tm.game_id, tm.round, tm.match_number,
      tm.player1_id, tm.player2_id, tm.winner_id, tm.status,
      u1.email AS player1_email, u2.email AS player2_email
    FROM tournament_matches tm
    LEFT JOIN users u1 ON u1.id = tm.player1_id
    LEFT JOIN users u2 ON u2.id = tm.player2_id
    WHERE tm.tournament_id = ${id}
    ORDER BY tm.round, tm.match_number
  `;

  return rowToTournament(row, playerRows.map(rowToPlayer), matchRows.map(rowToMatch));
}

export async function getMyTournaments(userId: number): Promise<Tournament[]> {
  const db = requireSql();

  const rows = await db`
    SELECT DISTINCT t.id, t.name, t.status, t.format, t.game_config,
           t.creator_id, t.max_players, t.season_halves, t.created_at, t.started_at, t.finished_at
    FROM tournaments t
    JOIN tournament_players tp ON tp.tournament_id = t.id AND tp.user_id = ${userId}
    WHERE t.status != 'finished' OR t.finished_at > now() - interval '7 days'
    ORDER BY t.created_at DESC
    LIMIT 15
  `;

  const tournaments: Tournament[] = [];
  for (const row of rows) {
    const t = await getTournament(row.id as string);
    if (t) tournaments.push(t);
  }
  return tournaments;
}

export async function startTournamentMatch(
  matchId: string,
  requestingUserId: number,
): Promise<string> {
  const db = requireSql();

  return await db.begin(async (tx) => {
    // Lock only the match row to avoid FOR UPDATE issues with multi-table JOINs
    const [match] = await tx`
      SELECT * FROM tournament_matches WHERE id = ${matchId} FOR UPDATE
    `;
    if (!match) throw new Error("Match not found");
    if (match.status !== "ready") throw new Error("Match not ready to play");

    // Verify requester is a participant
    const p1 = Number(match.player1_id);
    const p2 = Number(match.player2_id);
    if (requestingUserId !== p1 && requestingUserId !== p2) {
      throw new Error("Not a participant");
    }

    // Idempotent: return existing game if already created
    if (match.game_id) return match.game_id as string;

    // Fetch tournament config and player emails separately
    const [tournament] = await tx`
      SELECT game_config FROM tournaments WHERE id = ${match.tournament_id as string}
    `;
    const [u1] = await tx`SELECT email, display_name FROM users WHERE id = ${p1}`;
    const [u2] = await tx`SELECT email, display_name FROM users WHERE id = ${p2}`;

    const config = tournament.game_config as GameConfig;
    const initialMatch = createMatch({
      ...config,
      players: [
        displayName(u1.email as string, u1.display_name as string | null),
        displayName(u2.email as string, u2.display_name as string | null),
      ],
    });

    // Create the game with both players pre-assigned, active immediately
    const [game] = await tx`
      INSERT INTO games (config, player1_id, player2_id, status, started_at, match_state)
      VALUES (
        ${tx.json(config as never)},
        ${p1},
        ${p2},
        'active',
        now(),
        ${tx.json(initialMatch as never)}
      )
      RETURNING id
    `;

    await tx`
      UPDATE tournament_matches
      SET game_id = ${game.id as string}, status = 'active'
      WHERE id = ${matchId}
    `;

    return game.id as string;
  });
}

export async function finishTournamentMatch(
  gameId: string,
  winnerUserId: number,
): Promise<void> {
  const db = requireSql();

  const [match] = await db`
    SELECT tm.*, t.format, t.id AS tournament_id
    FROM tournament_matches tm
    JOIN tournaments t ON t.id = tm.tournament_id
    WHERE tm.game_id = ${gameId}
  `;
  if (!match) return; // Not a tournament game — no-op

  const tournamentId = match.tournament_id as string;

  await db`
    UPDATE tournament_matches
    SET winner_id = ${winnerUserId}, status = 'finished'
    WHERE id = ${match.id as string}
  `;

  // For single-elim: advance winner to next round
  if (match.format === "single_elim") {
    const round = Number(match.round);
    const matchNumber = Number(match.match_number);
    const adv = getAdvancementSlot(round, matchNumber);

    // Check if there is a next-round match
    const [nextMatch] = await db`
      SELECT id, player1_id, player2_id FROM tournament_matches
      WHERE tournament_id = ${tournamentId}
        AND round = ${adv.round}
        AND match_number = ${adv.matchNumber}
    `;

    if (nextMatch) {
      if (adv.slot === "player1") {
        await db`
          UPDATE tournament_matches
          SET player1_id = ${winnerUserId}, status = CASE
            WHEN player2_id IS NOT NULL THEN 'ready'
            ELSE 'pending'
          END
          WHERE id = ${nextMatch.id as string}
        `;
      } else {
        await db`
          UPDATE tournament_matches
          SET player2_id = ${winnerUserId}, status = CASE
            WHEN player1_id IS NOT NULL THEN 'ready'
            ELSE 'pending'
          END
          WHERE id = ${nextMatch.id as string}
        `;
      }
    }
  }

  // Check if tournament is over (all non-bye matches finished)
  const [{ remaining }] = await db`
    SELECT COUNT(*) AS remaining
    FROM tournament_matches
    WHERE tournament_id = ${tournamentId}
      AND status NOT IN ('finished', 'bye')
  `;

  if (Number(remaining) === 0) {
    await db`
      UPDATE tournaments
      SET status = 'finished', finished_at = now()
      WHERE id = ${tournamentId}
    `;
  }
}

export async function deleteTournament(
  id: string,
  creatorId: number,
): Promise<void> {
  const db = requireSql();
  const [result] = await db`
    DELETE FROM tournaments
    WHERE id = ${id} AND creator_id = ${creatorId}
    RETURNING id
  `;
  if (!result) throw new Error("Tournament not found or not authorized");
}

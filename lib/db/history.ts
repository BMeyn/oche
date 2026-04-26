import { sql } from "@/lib/db";
import { computeStats } from "@/lib/scoring";
import { computeRankings } from "@/lib/tournament";
import { getTournament } from "@/lib/db/tournaments";
import type { GameConfig, Match, TournamentFormat } from "@/lib/types";
import { displayName } from "@/lib/display";

export interface GameHistoryItem {
  id: string;
  date: Date;
  opponent: string;
  config: GameConfig;
  result: "win" | "loss";
  legsWon: number;
  legsLost: number;
  threeDartAvg: number;
  tonEighty: number;
  bestFinish: number;
}

export interface TournamentHistoryItem {
  id: string;
  name: string;
  format: TournamentFormat;
  playerCount: number;
  date: Date;
  rank: number;
  wins: number;
  played: number;
}

export async function getGameHistory(
  userId: number,
  limit = 50,
): Promise<GameHistoryItem[]> {
  if (!sql) return [];

  const rows = await sql`
    SELECT
      g.id, g.config, g.player1_id, g.player2_id, g.finished_at, g.match_state,
      u1.email AS player1_email, u1.display_name AS player1_display_name,
      u2.email AS player2_email, u2.display_name AS player2_display_name
    FROM games g
    JOIN users u1 ON u1.id = g.player1_id
    LEFT JOIN users u2 ON u2.id = g.player2_id
    WHERE (g.player1_id = ${userId} OR g.player2_id = ${userId})
      AND g.status = 'finished'
      AND g.match_state IS NOT NULL
    ORDER BY g.finished_at DESC NULLS LAST
    LIMIT ${limit}
  `;

  const items: GameHistoryItem[] = [];
  for (const row of rows) {
    try {
      const match = row.match_state as Match;
      if (match.winner === null) continue;

      const isPlayer1 = Number(row.player1_id) === userId;
      const playerIdx = isPlayer1 ? 0 : 1;
      const opponentIdx = (1 - playerIdx) as 0 | 1;

      const [stats0, stats1] = computeStats(match);
      const myStats = playerIdx === 0 ? stats0 : stats1;

      const opponentEmail = isPlayer1
        ? (row.player2_email as string | null)
        : (row.player1_email as string);
      const opponentDisplayName = isPlayer1
        ? (row.player2_display_name as string | null)
        : (row.player1_display_name as string | null);
      const opponent = opponentEmail
        ? displayName(opponentEmail, opponentDisplayName)
        : match.config.players[opponentIdx];

      items.push({
        id: row.id as string,
        date: (row.finished_at as Date) ?? new Date(),
        opponent,
        config: row.config as GameConfig,
        result: match.winner === playerIdx ? "win" : "loss",
        legsWon: match.legsWon[playerIdx],
        legsLost: match.legsWon[opponentIdx],
        threeDartAvg: myStats.threeDartAvg,
        tonEighty: myStats.tonEighty,
        bestFinish: myStats.bestFinish,
      });
    } catch {
      // skip malformed records
    }
  }
  return items;
}

export async function getTournamentHistory(
  userId: number,
  limit = 20,
): Promise<TournamentHistoryItem[]> {
  if (!sql) return [];

  const rows = await sql`
    SELECT t.id
    FROM tournaments t
    JOIN tournament_players tp ON tp.tournament_id = t.id AND tp.user_id = ${userId}
    WHERE t.status = 'finished'
    ORDER BY t.finished_at DESC NULLS LAST
    LIMIT ${limit}
  `;

  const items: TournamentHistoryItem[] = [];
  for (const row of rows) {
    const t = await getTournament(row.id as string);
    if (!t) continue;

    const rankings = computeRankings(t.players, t.matches, t.format);
    const myRank = rankings.find((r) => r.userId === userId);
    if (!myRank) continue;

    items.push({
      id: t.id,
      name: t.name,
      format: t.format,
      playerCount: t.players.length,
      date: t.finishedAt ?? t.createdAt,
      rank: myRank.rank,
      wins: myRank.wins,
      played: myRank.played,
    });
  }
  return items;
}

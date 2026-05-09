import { sql } from "@/lib/db";
import { computeStats, computeTrainingStats } from "@/lib/scoring";
import { computeRankings } from "@/lib/tournament";
import { getTournament } from "@/lib/db/tournaments";
import type { GameConfig, Match, TournamentFormat, TrainingDrill } from "@/lib/types";
import { displayName } from "@/lib/display";

export interface TrainingHistorySummary {
  drill: TrainingDrill;
  resultLabel: string;   // e.g. "12 / 21", "447 pts", "BUSTED"
  metricLabel: string;   // e.g. "57% accuracy", "8/10 checkouts"
}

export interface GameHistoryItem {
  id: string;
  date: Date;
  opponent: string;
  /** User id of the opponent, or null for guest / training games */
  opponentUserId: number | null;
  config: GameConfig;
  result: "win" | "loss";
  legsWon: number;
  legsLost: number;
  threeDartAvg: number;
  tonEighty: number;
  bestFinish: number;
  isGuestGame: boolean;
  isTraining: boolean;
  trainingSummary?: TrainingHistorySummary;
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

      // Training session
      if (match.config.mode === "training" && match.training) {
        const ts = computeTrainingStats(match.training);
        const drill = match.training.drill;
        let resultLabel = "";
        let metricLabel = "";
        if (drill === "doubles") {
          resultLabel = `${ts.hits} / 21`;
          metricLabel = `${ts.accuracyPct.toFixed(0)}% accuracy · streak ${ts.longestStreak}`;
        } else if (drill === "bobs27") {
          resultLabel = match.training.finalKind === "bust" ? "BUSTED" : `${ts.finalScore ?? 0} pts`;
          metricLabel = `${ts.hits} hits · ${ts.totalDarts} darts`;
        } else {
          resultLabel = `${ts.hits} / ${ts.attempts}`;
          metricLabel = ts.bestFinish ? `best ${ts.bestFinish}` : `${ts.accuracyPct.toFixed(0)}%`;
        }
        items.push({
          id: row.id as string,
          date: (row.finished_at as Date) ?? new Date(),
          opponent: "",
          opponentUserId: null,
          config: row.config as GameConfig,
          result: "win",
          legsWon: 0,
          legsLost: 0,
          threeDartAvg: 0,
          tonEighty: 0,
          bestFinish: ts.bestFinish ?? 0,
          isGuestGame: true,
          isTraining: true,
          trainingSummary: { drill, resultLabel, metricLabel },
        });
        continue;
      }

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
      const opponentRawId = isPlayer1 ? row.player2_id : row.player1_id;
      const opponentUserId =
        opponentRawId === null || opponentRawId === undefined
          ? null
          : Number(opponentRawId);

      items.push({
        id: row.id as string,
        date: (row.finished_at as Date) ?? new Date(),
        opponent,
        opponentUserId,
        config: row.config as GameConfig,
        result: match.winner === playerIdx ? "win" : "loss",
        legsWon: match.legsWon[playerIdx],
        legsLost: match.legsWon[opponentIdx],
        threeDartAvg: myStats.threeDartAvg,
        tonEighty: myStats.tonEighty,
        bestFinish: myStats.bestFinish,
        isGuestGame: row.player2_id === null,
        isTraining: false,
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

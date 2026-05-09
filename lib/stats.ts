// lib/stats.ts — pure aggregation helpers for GameHistoryItem lists.
// No DB / I/O — same purity contract as lib/scoring.ts and lib/tournament.ts.

import type { GameHistoryItem } from "@/lib/db/history";

export interface AggregateRankedStats {
  totalGames: number;
  wins: number;
  losses: number;
  /** 0–100, rounded */
  winRate: number;
  /** "29.45" or "—" */
  threeDartAvg: string;
  total180s: number;
  /** 0 if no checkout recorded */
  bestFinish: number;
}

/** Guest games and training sessions don't count toward ranked stats. */
export function rankedFilter(games: GameHistoryItem[]): GameHistoryItem[] {
  return games.filter((g) => !g.isGuestGame && !g.isTraining);
}

export function aggregateRankedStats(games: GameHistoryItem[]): AggregateRankedStats {
  const ranked = rankedFilter(games);
  const totalGames = ranked.length;
  const wins = ranked.filter((g) => g.result === "win").length;
  const losses = totalGames - wins;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  const avgSum = ranked.reduce((s, g) => s + g.threeDartAvg, 0);
  const threeDartAvg = totalGames > 0 ? (avgSum / totalGames).toFixed(2) : "—";
  const total180s = ranked.reduce((s, g) => s + g.tonEighty, 0);
  const bestFinish = ranked.reduce(
    (best, g) => (g.bestFinish > best ? g.bestFinish : best),
    0,
  );
  return { totalGames, wins, losses, winRate, threeDartAvg, total180s, bestFinish };
}

/** Last `n` ranked results, newest first (matches the order returned by getGameHistory). */
export function recentForm(
  games: GameHistoryItem[],
  n = 10,
): ("win" | "loss")[] {
  return rankedFilter(games)
    .slice(0, n)
    .map((g) => g.result);
}

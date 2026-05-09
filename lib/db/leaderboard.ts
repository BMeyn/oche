import { sql } from "@/lib/db";
import { computeStats } from "@/lib/scoring";
import type { Match } from "@/lib/types";

export interface LeaderboardEntry {
  userId: number;
  email: string;
  displayName: string | null;
  avatarColor: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  /** 0–100, rounded */
  winRate: number;
  /** Mean of per-game 3-dart averages — same definition as aggregateRankedStats. */
  threeDartAvg: number;
  total180s: number;
  /** 0 if none recorded */
  bestFinish: number;
}

interface Accumulator {
  userId: number;
  email: string;
  displayName: string | null;
  avatarColor: string;
  gamesPlayed: number;
  wins: number;
  threeDartAvgSum: number;
  total180s: number;
  bestFinish: number;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  if (!sql) return [];

  const rows = await sql`
    SELECT
      g.id, g.match_state,
      g.player1_id, g.player2_id,
      u1.email AS p1_email, u1.display_name AS p1_dn, u1.avatar_color AS p1_color,
      u2.email AS p2_email, u2.display_name AS p2_dn, u2.avatar_color AS p2_color
    FROM games g
    JOIN users u1 ON u1.id = g.player1_id
    JOIN users u2 ON u2.id = g.player2_id
    WHERE g.status = 'finished'
      AND g.match_state IS NOT NULL
      AND (g.config->>'mode' IS NULL OR g.config->>'mode' <> 'training')
  `;

  const acc = new Map<number, Accumulator>();

  for (const row of rows) {
    try {
      const match = row.match_state as Match;
      if (match.winner === null) continue;

      const [stats0, stats1] = computeStats(match);

      const sides: Array<{
        userId: number;
        email: string;
        displayName: string | null;
        avatarColor: string;
        won: boolean;
        threeDartAvg: number;
        tonEighty: number;
        bestFinish: number;
      }> = [
        {
          userId: Number(row.player1_id),
          email: row.p1_email as string,
          displayName: (row.p1_dn as string | null) ?? null,
          avatarColor: (row.p1_color as string) ?? "#6d736f",
          won: match.winner === 0,
          threeDartAvg: stats0.threeDartAvg,
          tonEighty: stats0.tonEighty,
          bestFinish: stats0.bestFinish,
        },
        {
          userId: Number(row.player2_id),
          email: row.p2_email as string,
          displayName: (row.p2_dn as string | null) ?? null,
          avatarColor: (row.p2_color as string) ?? "#6d736f",
          won: match.winner === 1,
          threeDartAvg: stats1.threeDartAvg,
          tonEighty: stats1.tonEighty,
          bestFinish: stats1.bestFinish,
        },
      ];

      for (const s of sides) {
        let entry = acc.get(s.userId);
        if (!entry) {
          entry = {
            userId: s.userId,
            email: s.email,
            displayName: s.displayName,
            avatarColor: s.avatarColor,
            gamesPlayed: 0,
            wins: 0,
            threeDartAvgSum: 0,
            total180s: 0,
            bestFinish: 0,
          };
          acc.set(s.userId, entry);
        }
        entry.gamesPlayed += 1;
        if (s.won) entry.wins += 1;
        entry.threeDartAvgSum += s.threeDartAvg;
        entry.total180s += s.tonEighty;
        if (s.bestFinish > entry.bestFinish) entry.bestFinish = s.bestFinish;
      }
    } catch {
      // skip malformed rows
    }
  }

  const entries: LeaderboardEntry[] = [];
  for (const a of acc.values()) {
    const losses = a.gamesPlayed - a.wins;
    const winRate = a.gamesPlayed > 0 ? Math.round((a.wins / a.gamesPlayed) * 100) : 0;
    const threeDartAvg = a.gamesPlayed > 0 ? a.threeDartAvgSum / a.gamesPlayed : 0;
    entries.push({
      userId: a.userId,
      email: a.email,
      displayName: a.displayName,
      avatarColor: a.avatarColor,
      gamesPlayed: a.gamesPlayed,
      wins: a.wins,
      losses,
      winRate,
      threeDartAvg,
      total180s: a.total180s,
      bestFinish: a.bestFinish,
    });
  }
  return entries;
}

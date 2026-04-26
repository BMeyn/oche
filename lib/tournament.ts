// lib/tournament.ts — pure bracket logic, no I/O
import type { TournamentFormat, TournamentMatch, TournamentPlayer } from "@/lib/types";

export interface RankedPlayer {
  rank: number;
  userId: number;
  email: string;
  wins: number;
  played: number;
  /** single-elim only: round they were eliminated in (undefined = champion) */
  eliminatedRound?: number;
}

export interface MatchSpec {
  round: number;
  matchNumber: number;
  player1Id: number | null; // null = bye / TBD
  player2Id: number | null;
  status: "pending" | "ready" | "bye";
}

export interface Standing {
  userId: number;
  email: string;
  displayName: string | null;
  wins: number;
  played: number;
}

// Smallest power of 2 >= n
function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

// Standard single-elim seeding for a bracket of size P.
// Returns the match-slot pairs in round-1 order.
// Convention: match 1 = seed 1 vs seed P, match 2 = seed P/2+1 vs seed P/2, etc.
// For P=8: [1v8, 4v5, 3v6, 2v7] — produces balanced halves.
function singleElimR1Pairs(p: number): [number, number][] {
  if (p === 2) return [[1, 2]];
  const pairs: [number, number][] = [];
  const half = p / 2;
  // Build bracket top-down using standard seeding
  // Seeds placed so that 1 and 2 can't meet before the final
  const slots = buildSlots(p);
  for (let i = 0; i < slots.length; i += 2) {
    pairs.push([slots[i], slots[i + 1]]);
  }
  return pairs;
  // suppress unused warning
  void half;
}

// Recursively places seeds into bracket slots (standard single-elim ordering)
function buildSlots(p: number): number[] {
  if (p === 2) return [1, 2];
  const prev = buildSlots(p / 2);
  const result: number[] = [];
  for (const seed of prev) {
    result.push(seed);
    result.push(p + 1 - seed); // complement
  }
  return result;
}

/**
 * Generate all match specs for a tournament given its players and format.
 * Seeds are assumed to already be assigned on the player objects.
 * seasonHalves: 1 = single round-robin, 2 = home + away (each pair plays twice)
 */
export function generateMatches(
  players: TournamentPlayer[],
  format: TournamentFormat,
  seasonHalves = 1,
): MatchSpec[] {
  if (format === "round_robin") {
    return generateRoundRobinMatches(players, seasonHalves);
  }
  return generateSingleElimMatches(players);
}

function generateRoundRobinMatches(players: TournamentPlayer[], halves: number): MatchSpec[] {
  const specs: MatchSpec[] = [];
  // First half (round 1)
  let matchNumber = 1;
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      specs.push({
        round: 1,
        matchNumber: matchNumber++,
        player1Id: players[i].userId,
        player2Id: players[j].userId,
        status: "ready",
      });
    }
  }
  // Second half (round 2) — reversed home/away
  if (halves >= 2) {
    matchNumber = 1;
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        specs.push({
          round: 2,
          matchNumber: matchNumber++,
          player1Id: players[j].userId,
          player2Id: players[i].userId,
          status: "ready",
        });
      }
    }
  }
  return specs;
}

function generateSingleElimMatches(players: TournamentPlayer[]): MatchSpec[] {
  const n = players.length;
  const p = nextPow2(n);
  const totalRounds = Math.log2(p);
  const specs: MatchSpec[] = [];

  // Build seed → userId map
  const seedMap = new Map<number, number>();
  for (const player of players) {
    if (player.seed !== null) seedMap.set(player.seed, player.userId);
  }

  // Round 1: P/2 matches
  const pairs = singleElimR1Pairs(p);
  for (let i = 0; i < pairs.length; i++) {
    const [s1, s2] = pairs[i];
    const p1 = seedMap.get(s1) ?? null; // null if bye seed
    const p2 = seedMap.get(s2) ?? null;
    const isBye = p1 === null || p2 === null;
    specs.push({
      round: 1,
      matchNumber: i + 1,
      player1Id: p1,
      player2Id: p2,
      status: isBye ? "bye" : "ready",
    });
  }

  // Subsequent rounds: all TBD (pending)
  for (let r = 2; r <= totalRounds; r++) {
    const matchesInRound = p / Math.pow(2, r);
    for (let m = 1; m <= matchesInRound; m++) {
      specs.push({
        round: r,
        matchNumber: m,
        player1Id: null,
        player2Id: null,
        status: "pending",
      });
    }
  }

  return specs;
}

/**
 * For single-elim: given a finished match (round, matchNumber),
 * return which next-round match it feeds into and which player slot.
 */
export function getAdvancementSlot(
  round: number,
  matchNumber: number,
): { round: number; matchNumber: number; slot: "player1" | "player2" } {
  return {
    round: round + 1,
    matchNumber: Math.ceil(matchNumber / 2),
    slot: matchNumber % 2 === 1 ? "player1" : "player2",
  };
}

/**
 * Round-robin: compute standings sorted by wins desc, then played asc.
 */
export function computeStandings(
  players: TournamentPlayer[],
  matches: TournamentMatch[],
): Standing[] {
  const map = new Map<number, Standing>();
  for (const p of players) {
    map.set(p.userId, { userId: p.userId, email: p.email, displayName: p.displayName ?? null, wins: 0, played: 0 });
  }

  for (const m of matches) {
    if (m.status !== "finished" || m.winnerId === null) continue;
    const loserId = m.winnerId === m.player1Id ? m.player2Id : m.player1Id;
    const winner = map.get(m.winnerId);
    if (winner) {
      winner.wins++;
      winner.played++;
    }
    if (loserId !== null) {
      const loser = map.get(loserId);
      if (loser) loser.played++;
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => b.wins - a.wins || a.played - b.played,
  );
}

/**
 * Compute final rankings for a finished tournament.
 * Round-robin: sorted by wins desc.
 * Single-elim: winner first, then by highest round reached desc.
 */
export function computeRankings(
  players: TournamentPlayer[],
  matches: TournamentMatch[],
  format: TournamentFormat,
): RankedPlayer[] {
  if (format === "round_robin") {
    return computeStandings(players, matches).map((s, i) => ({
      rank: i + 1,
      userId: s.userId,
      email: s.email,
      wins: s.wins,
      played: s.played,
    }));
  }

  // Single-elim: find highest round each player reached, count wins/played
  const finishedMatches = matches.filter((m) => m.status === "finished");
  const maxRound = finishedMatches.length
    ? Math.max(...finishedMatches.map((m) => m.round))
    : 0;
  const finalMatch = finishedMatches.find((m) => m.round === maxRound);
  const winnerId = finalMatch?.winnerId ?? null;

  const statsMap = new Map<number, { wins: number; played: number; highestRound: number }>();
  for (const p of players) statsMap.set(p.userId, { wins: 0, played: 0, highestRound: 0 });

  for (const m of finishedMatches) {
    const loserId = m.winnerId === m.player1Id ? m.player2Id : m.player1Id;
    if (m.winnerId !== null) {
      const w = statsMap.get(m.winnerId);
      if (w) { w.wins++; w.played++; w.highestRound = Math.max(w.highestRound, m.round); }
    }
    if (loserId !== null) {
      const l = statsMap.get(loserId);
      if (l) { l.played++; l.highestRound = Math.max(l.highestRound, m.round); }
    }
  }

  return players
    .map((p) => {
      const s = statsMap.get(p.userId) ?? { wins: 0, played: 0, highestRound: 0 };
      return { ...p, ...s, isWinner: p.userId === winnerId };
    })
    .sort((a, b) => {
      if (a.isWinner !== b.isWinner) return a.isWinner ? -1 : 1;
      return b.highestRound - a.highestRound || b.wins - a.wins;
    })
    .map((p, i) => ({
      rank: i + 1,
      userId: p.userId,
      email: p.email,
      wins: p.wins,
      played: p.played,
      eliminatedRound: p.isWinner ? undefined : p.highestRound,
    }));
}

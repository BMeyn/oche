// lib/types.ts — shared types for the scoring engine and auth

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  email: string;
  displayName: string | null;
  avatarColor: string;
  createdAt: Date;
}

export interface FriendEntry {
  requestId: number;
  userId: number;
  email: string;
  displayName: string | null;
  avatarColor: string;
  status: "pending" | "accepted";
  direction: "incoming" | "outgoing";
  // aggregate stats — only populated for accepted friends
  gamesPlayed?: number;
  winRate?: number;      // 0–100
  threeDartAvg?: number;
}

export interface Session {
  id: string;
  userId: number;
  expiresAt: Date;
}

// ─── Scoring engine ───────────────────────────────────────────────────────────

export type Multiplier = 1 | 2 | 3;

export interface Dart {
  multiplier: Multiplier;
  /** Dartboard number 0..20, or 25 for bull (single-25 outer, double-25 = bullseye = 50) */
  number: number;
  /** multiplier * number */
  score: number;
  /** Display label like "T20", "D16", "BULL", "MISS" */
  label: string;
}

export type TurnKind = "ok" | "bust" | "win";

export interface Turn {
  darts: Dart[];
  /** Score added to the running total (0 if bust, post-double-in adjusted) */
  total: number;
  /** Raw sum of darts ignoring rules */
  rawTotal: number;
  kind: TurnKind;
  remainingBefore: number;
  remainingAfter: number;
  /** Total darts physically thrown */
  dartsCount: number;
  /** Darts that count toward 3-dart average (excludes pre-double-in darts) */
  countedDartsCount: number;
}

export interface Leg {
  number: number;
  remaining: [number, number];
  hasStarted: [boolean, boolean];
  turns: [Turn[], Turn[]];
  currentPlayer: 0 | 1;
  startingPlayer: 0 | 1;
  currentTurnDarts: Dart[];
  /** High-Low: best 3-dart total each player has put up this leg */
  highlowBest: [number | null, number | null];
}

export interface CompletedLeg {
  number: number;
  winner: 0 | 1;
  turns: [Turn[], Turn[]];
  startingPlayer: 0 | 1;
}

export type GameMode = "x01" | "highlow";
export type InRule = "straight" | "double";
export type OutRule = "straight" | "double" | "master";

export interface MatchConfig {
  players: [string, string];
  legsToWin: number;
  mode: GameMode;
  startingScore: number; // 0 for highlow
  inRule?: InRule;
  outRule?: OutRule;
}

export interface Match {
  config: MatchConfig;
  currentLeg: Leg;
  legsWon: [number, number];
  legHistory: CompletedLeg[];
  winner: 0 | 1 | null;
  startedAt: number;
  endedAt?: number;
}

export type ApplyOutcome =
  | "dart"
  | "turn-end"
  | "bust"
  | "leg-won"
  | "match-won"
  | "match-over";

// ─── Lobby / Games ───────────────────────────────────────────────────────────

export type GameStatus = "waiting" | "active" | "finished";

export interface GameConfig {
  mode: GameMode;
  startingScore: number; // 0 for highlow
  legsToWin: number;
  inRule?: InRule;
  outRule?: OutRule;
}

export interface Game {
  id: string;
  status: GameStatus;
  config: GameConfig;
  player1Id: number;
  player1Email: string;
  player2Id: number | null;
  player2Email: string | null;
  matchState: Match | null;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
}

// ─── Tournaments ─────────────────────────────────────────────────────────────

export type TournamentFormat = "single_elim" | "round_robin";
export type TournamentStatus = "waiting" | "active" | "finished";
export type TournamentMatchStatus = "pending" | "ready" | "active" | "finished" | "bye";

export interface Tournament {
  id: string;
  name: string;
  status: TournamentStatus;
  format: TournamentFormat;
  gameConfig: GameConfig;
  creatorId: number;
  maxPlayers: number;
  seasonHalves: number; // 1 = single round-robin, 2 = home + away (round_robin only)
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  players: TournamentPlayer[];
  matches: TournamentMatch[];
}

export interface TournamentPlayer {
  userId: number;
  email: string;
  displayName: string | null;
  seed: number | null;
  joinedAt: Date;
}

export interface TournamentMatch {
  id: string;
  tournamentId: string;
  gameId: string | null;
  round: number;
  matchNumber: number;
  player1Id: number | null;
  player1Email: string | null;
  player2Id: number | null;
  player2Email: string | null;
  winnerId: number | null;
  status: TournamentMatchStatus;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface PlayerStats {
  threeDartAvg: number;
  totalDarts: number;
  totalScore: number;
  doubles: number;
  triples: number;
  bulls25: number;
  bullseyes: number;
  misses: number;
  tons: number;
  tonForty: number;
  tonEighty: number;
  bestFinish: number;
  highestTurn: number;
  legsWon: number;
}

// lib/scoring.ts — pure scoring engine for X01, High-Low, Around the Clock, and Training drills
import type {
  Dart, Multiplier, Turn, Leg, Match, MatchConfig,
  ApplyOutcome, PlayerStats,
  TrainingState, TrainingRound, TrainingTarget, TrainingStats, TrainingDrill,
} from "./types";
import { CHECKOUTS_DOUBLE } from "./checkouts";

// ─── Dart construction ──────────────────────────────────────────────

export function makeDart(multiplier: Multiplier, number: number): Dart {
  const score = multiplier * number;
  let label: string;
  if (score === 0) label = "MISS";
  else if (number === 25 && multiplier === 2) label = "BULL";
  else if (number === 25) label = "25";
  else if (multiplier === 3) label = `T${number}`;
  else if (multiplier === 2) label = `D${number}`;
  else label = `${number}`;
  return { multiplier, number, score, label };
}

export const DART_MISS: Dart = makeDart(1, 0);

export const sumDarts = (arr: Dart[]): number =>
  arr.reduce((a, d) => a + d.score, 0);

export const isDouble = (d: Dart): boolean => d.multiplier === 2 && d.number > 0;
export const isTriple = (d: Dart): boolean => d.multiplier === 3 && d.number > 0;

// ─── Match creation ─────────────────────────────────────────────────

export function createMatch(config: MatchConfig): Match {
  const startingScore = config.mode === "x01" ? config.startingScore : 0;
  const base: Match = {
    config: { ...config, startingScore },
    currentLeg: makeFreshLeg(1, 0, startingScore),
    legsWon: [0, 0],
    legHistory: [],
    winner: null,
    startedAt: Date.now(),
  };
  if (config.mode === "training") {
    base.training = createTrainingState(config);
  }
  return base;
}

function createTrainingState(config: MatchConfig): TrainingState {
  const drill = config.drill ?? "doubles";
  const state: TrainingState = {
    drill,
    cursor: 0,
    rounds: [],
    currentDarts: [],
    score: drill === "bobs27" ? 27 : 0,
    finished: false,
  };
  if (drill === "checkout") {
    const n = Math.max(1, Math.min(50, config.scenarioCount ?? 10));
    state.scenarios = generateCheckoutScenarios(n);
  }
  return state;
}

function makeFreshLeg(number: number, startingPlayer: 0 | 1, startingScore: number): Leg {
  return {
    number,
    remaining: [startingScore, startingScore],
    hasStarted: [false, false],
    turns: [[], []],
    currentPlayer: startingPlayer,
    startingPlayer,
    currentTurnDarts: [],
    highlowBest: [null, null],
    atcProgress: [1, 1],
  };
}

// ─── Around the Clock helpers ──────────────────────────────────────

function atcAdvances(target: number, dart: Dart): boolean {
  if (target >= 1 && target <= 20) return dart.number === target;
  if (target === 21) return dart.number === 25 && dart.multiplier === 1;
  if (target === 22) return dart.number === 25 && dart.multiplier === 2;
  return false;
}

export function atcTargetLabel(progress: number): string {
  if (progress >= 1 && progress <= 20) return String(progress);
  if (progress === 21) return "25";
  if (progress === 22) return "BULL";
  return "DONE";
}

// ─── Live (in-progress) remaining for the active player ────────────

export function displayRemaining(match: Match, p: 0 | 1): number {
  const leg = match.currentLeg;
  if (match.config.mode === "atc") return leg.atcProgress[p];
  if (match.config.mode !== "x01") return 0;
  if (p !== leg.currentPlayer) return leg.remaining[p];

  // Double-in: only count from the opening double onward
  if (match.config.inRule === "double" && !leg.hasStarted[p]) {
    const startIdx = leg.currentTurnDarts.findIndex(isDouble);
    if (startIdx === -1) return leg.remaining[p];
    const counted = leg.currentTurnDarts
      .slice(startIdx)
      .reduce((a, d) => a + d.score, 0);
    return leg.remaining[p] - counted;
  }
  return leg.remaining[p] - sumDarts(leg.currentTurnDarts);
}

// ─── Apply a single dart ───────────────────────────────────────────

export function applyDart(match: Match, dart: Dart): { match: Match; outcome: ApplyOutcome } {
  if (match.winner !== null) return { match, outcome: "match-over" };
  if (match.config.mode === "training") return applyDartTraining(match, dart);
  if (match.config.mode === "highlow") return applyDartHighLow(match, dart);
  if (match.config.mode === "atc") return applyDartATC(match, dart);
  return applyDartX01(match, dart);
}

function applyDartX01(match: Match, dart: Dart): { match: Match; outcome: ApplyOutcome } {
  const p = match.currentLeg.currentPlayer;
  const leg = match.currentLeg;
  const inProgress = leg.currentTurnDarts;
  const newTurnDarts = [...inProgress, dart];

  const inRule = match.config.inRule ?? "straight";
  const outRule = match.config.outRule ?? "double";

  // Has the player already opened scoring? Either committed (across turns) or
  // mid-turn via an earlier dart in this same turn.
  const startedBefore = leg.hasStarted[p] || (inRule === "double" && inProgress.some(isDouble));

  // ── effective remaining BEFORE applying this dart ──
  let effectiveBefore: number;
  if (inRule === "double" && !leg.hasStarted[p]) {
    const firstDoubleIdx = inProgress.findIndex(isDouble);
    if (firstDoubleIdx === -1) {
      effectiveBefore = leg.remaining[p];
    } else {
      effectiveBefore = leg.remaining[p] -
        inProgress.slice(firstDoubleIdx).reduce((a, d) => a + d.score, 0);
    }
  } else {
    effectiveBefore = leg.remaining[p] - sumDarts(inProgress);
  }

  // Does THIS dart count?
  let countedScore = dart.score;
  let willHaveStarted = startedBefore;
  if (inRule === "double" && !startedBefore) {
    if (isDouble(dart)) {
      willHaveStarted = true;
      // counted = dart.score (the opening double counts)
    } else {
      countedScore = 0;
    }
  }

  const effectiveAfter = effectiveBefore - countedScore;

  // ── Bust / win classification ───────────────────────────────────
  let bust = false, win = false;
  if (effectiveAfter < 0) {
    bust = true;
  } else if (effectiveAfter === 0) {
    if (outRule === "straight") win = true;
    else if (outRule === "double") win = isDouble(dart) ? true : (bust = true, false);
    else if (outRule === "master") win = (isDouble(dart) || isTriple(dart)) ? true : (bust = true, false);
  } else if (effectiveAfter === 1 && (outRule === "double" || outRule === "master")) {
    bust = true;
  }

  const turnFull = newTurnDarts.length >= 3;
  const finalize = bust || win || turnFull;

  if (!finalize) {
    return {
      match: {
        ...match,
        currentLeg: {
          ...leg,
          currentTurnDarts: newTurnDarts,
          // Don't commit hasStarted mid-turn — it gets carried in newTurnDarts
          // and the next dart will see it via inProgress.some(isDouble).
        },
      },
      outcome: "dart",
    };
  }

  // ── Finalize the turn ───────────────────────────────────────────
  const turnTotalRaw = sumDarts(newTurnDarts);

  let turnTotalCounted: number;
  let countedDartsCount: number;

  if (bust) {
    turnTotalCounted = 0;
    countedDartsCount = newTurnDarts.length;
  } else if (inRule === "double" && !leg.hasStarted[p]) {
    if (!willHaveStarted) {
      turnTotalCounted = 0;
      countedDartsCount = 0;
    } else {
      const startIdx = newTurnDarts.findIndex(isDouble);
      turnTotalCounted = newTurnDarts
        .slice(startIdx)
        .reduce((a, d) => a + d.score, 0);
      countedDartsCount = newTurnDarts.length - startIdx;
    }
  } else {
    turnTotalCounted = turnTotalRaw;
    countedDartsCount = newTurnDarts.length;
  }

  const completedTurn: Turn = {
    darts: newTurnDarts,
    total: turnTotalCounted,
    rawTotal: turnTotalRaw,
    kind: bust ? "bust" : win ? "win" : "ok",
    remainingBefore: leg.remaining[p],
    remainingAfter: bust ? leg.remaining[p] : effectiveAfter,
    dartsCount: newTurnDarts.length,
    countedDartsCount,
  };

  const turns = leg.turns.map((arr, i) =>
    i === p ? [...arr, completedTurn] : arr,
  ) as [Turn[], Turn[]];
  const newRemaining = [...leg.remaining] as [number, number];
  newRemaining[p] = completedTurn.remainingAfter;
  const newHasStarted = leg.hasStarted.map((v, i) =>
    i === p ? v || willHaveStarted : v,
  ) as [boolean, boolean];

  if (win) {
    const legsWon = [...match.legsWon] as [number, number];
    legsWon[p] += 1;
    const completedLeg = {
      number: leg.number,
      winner: p,
      turns,
      startingPlayer: leg.startingPlayer,
    };
    const matchWon = legsWon[p] >= match.config.legsToWin;
    if (matchWon) {
      return {
        match: {
          ...match,
          currentLeg: { ...leg, turns, remaining: newRemaining, currentTurnDarts: [], hasStarted: newHasStarted },
          legsWon,
          legHistory: [...match.legHistory, completedLeg],
          winner: p,
          endedAt: Date.now(),
        },
        outcome: "match-won",
      };
    }
    const nextStarter = (1 - leg.startingPlayer) as 0 | 1;
    return {
      match: {
        ...match,
        legsWon,
        legHistory: [...match.legHistory, completedLeg],
        currentLeg: makeFreshLeg(leg.number + 1, nextStarter, match.config.startingScore),
      },
      outcome: "leg-won",
    };
  }

  return {
    match: {
      ...match,
      currentLeg: {
        ...leg,
        remaining: newRemaining,
        turns,
        currentPlayer: (1 - p) as 0 | 1,
        currentTurnDarts: [],
        hasStarted: newHasStarted,
      },
    },
    outcome: bust ? "bust" : "turn-end",
  };
}

function applyDartHighLow(match: Match, dart: Dart): { match: Match; outcome: ApplyOutcome } {
  const p = match.currentLeg.currentPlayer;
  const leg = match.currentLeg;
  const newTurnDarts = [...leg.currentTurnDarts, dart];
  const turnFull = newTurnDarts.length >= 3;

  if (!turnFull) {
    return {
      match: { ...match, currentLeg: { ...leg, currentTurnDarts: newTurnDarts } },
      outcome: "dart",
    };
  }

  const turnTotal = sumDarts(newTurnDarts);
  const completedTurn: Turn = {
    darts: newTurnDarts,
    total: turnTotal,
    rawTotal: turnTotal,
    kind: "ok",
    remainingBefore: 0,
    remainingAfter: 0,
    dartsCount: 3,
    countedDartsCount: 3,
  };
  const turns = leg.turns.map((arr, i) =>
    i === p ? [...arr, completedTurn] : arr,
  ) as [Turn[], Turn[]];
  const newBest = [...leg.highlowBest] as [number | null, number | null];
  if (newBest[p] === null || turnTotal > (newBest[p] as number)) newBest[p] = turnTotal;

  const bothPlayed = turns[0].length >= 1 && turns[1].length >= 1;
  if (bothPlayed) {
    const a = newBest[0]!, b = newBest[1]!;
    if (a !== b) {
      const winnerP: 0 | 1 = a > b ? 0 : 1;
      const legsWon = [...match.legsWon] as [number, number];
      legsWon[winnerP] += 1;
      const completedLeg = { number: leg.number, winner: winnerP, turns, startingPlayer: leg.startingPlayer };
      const matchWon = legsWon[winnerP] >= match.config.legsToWin;
      if (matchWon) {
        return {
          match: {
            ...match,
            currentLeg: { ...leg, turns, currentTurnDarts: [], highlowBest: newBest },
            legsWon, legHistory: [...match.legHistory, completedLeg],
            winner: winnerP, endedAt: Date.now(),
          },
          outcome: "match-won",
        };
      }
      const nextStarter = (1 - leg.startingPlayer) as 0 | 1;
      return {
        match: {
          ...match,
          legsWon,
          legHistory: [...match.legHistory, completedLeg],
          currentLeg: makeFreshLeg(leg.number + 1, nextStarter, 0),
        },
        outcome: "leg-won",
      };
    }
    // tie -> sudden-death extra turn each, fall through
  }

  return {
    match: {
      ...match,
      currentLeg: {
        ...leg, turns,
        currentPlayer: (1 - p) as 0 | 1,
        currentTurnDarts: [],
        highlowBest: newBest,
      },
    },
    outcome: "turn-end",
  };
}

function applyDartATC(match: Match, dart: Dart): { match: Match; outcome: ApplyOutcome } {
  const p = match.currentLeg.currentPlayer;
  const leg = match.currentLeg;
  const newTurnDarts = [...leg.currentTurnDarts, dart];

  const progressBefore = leg.atcProgress[p];
  let progress = progressBefore;
  for (const d of newTurnDarts) {
    if (atcAdvances(progress, d)) progress++;
  }
  const reachedEnd = progress >= 23;
  const turnFull = newTurnDarts.length >= 3;
  const finalize = reachedEnd || turnFull;

  if (!finalize) {
    return {
      match: { ...match, currentLeg: { ...leg, currentTurnDarts: newTurnDarts } },
      outcome: "dart",
    };
  }

  const completedTurn: Turn = {
    darts: newTurnDarts,
    total: 0,
    rawTotal: sumDarts(newTurnDarts),
    kind: reachedEnd ? "win" : "ok",
    remainingBefore: 0,
    remainingAfter: 0,
    dartsCount: newTurnDarts.length,
    countedDartsCount: newTurnDarts.length,
    atcProgressBefore: progressBefore,
  };
  const turns = leg.turns.map((arr, i) =>
    i === p ? [...arr, completedTurn] : arr,
  ) as [Turn[], Turn[]];
  const newProgress = [...leg.atcProgress] as [number, number];
  newProgress[p] = progress;

  if (reachedEnd) {
    const legsWon = [...match.legsWon] as [number, number];
    legsWon[p] += 1;
    const completedLeg = { number: leg.number, winner: p, turns, startingPlayer: leg.startingPlayer };
    const matchWon = legsWon[p] >= match.config.legsToWin;
    if (matchWon) {
      return {
        match: {
          ...match,
          currentLeg: { ...leg, turns, currentTurnDarts: [], atcProgress: newProgress },
          legsWon, legHistory: [...match.legHistory, completedLeg],
          winner: p, endedAt: Date.now(),
        },
        outcome: "match-won",
      };
    }
    const nextStarter = (1 - leg.startingPlayer) as 0 | 1;
    return {
      match: {
        ...match,
        legsWon,
        legHistory: [...match.legHistory, completedLeg],
        currentLeg: makeFreshLeg(leg.number + 1, nextStarter, 0),
      },
      outcome: "leg-won",
    };
  }

  return {
    match: {
      ...match,
      currentLeg: {
        ...leg, turns,
        currentPlayer: (1 - p) as 0 | 1,
        currentTurnDarts: [],
        atcProgress: newProgress,
      },
    },
    outcome: "turn-end",
  };
}

// ─── Training drills ───────────────────────────────────────────────

export function trainingTotalRounds(state: TrainingState, config: MatchConfig): number {
  if (state.drill === "doubles") return 21;        // D1..D20 + BULL
  if (state.drill === "bobs27") return 20;         // D1..D20
  return state.scenarios?.length ?? config.scenarioCount ?? 10;
}

export function trainingCurrentTarget(state: TrainingState): TrainingTarget | null {
  if (state.finished) return null;
  if (state.drill === "doubles") {
    if (state.cursor < 20) return { kind: "double", n: state.cursor + 1 };
    return { kind: "bull" };
  }
  if (state.drill === "bobs27") {
    return { kind: "double", n: state.cursor + 1 };
  }
  // checkout
  if (!state.scenarios || state.cursor >= state.scenarios.length) return null;
  return { kind: "checkout", remaining: state.scenarios[state.cursor] };
}

function dartHitsDoubleTarget(dart: Dart, n: number): boolean {
  return dart.multiplier === 2 && dart.number === n;
}

function dartHitsBull(dart: Dart): boolean {
  return dart.multiplier === 2 && dart.number === 25;
}

function applyDartTraining(match: Match, dart: Dart): { match: Match; outcome: ApplyOutcome } {
  if (!match.training) return { match, outcome: "match-over" };
  if (match.training.finished) return { match, outcome: "match-over" };
  switch (match.training.drill) {
    case "doubles":  return applyDartDoubles(match, dart);
    case "bobs27":   return applyDartBobs27(match, dart);
    case "checkout": return applyDartCheckout(match, dart);
  }
}

function withTraining(match: Match, training: TrainingState): Match {
  return { ...match, training };
}

function pushDart(state: TrainingState, dart: Dart): TrainingState {
  return { ...state, currentDarts: [...state.currentDarts, dart] };
}

function commitRound(state: TrainingState, round: TrainingRound): TrainingState {
  return {
    ...state,
    rounds: [...state.rounds, round],
    currentDarts: [],
    cursor: state.cursor + 1,
  };
}

function applyDartDoubles(match: Match, dart: Dart): { match: Match; outcome: ApplyOutcome } {
  const t = match.training!;
  const target = trainingCurrentTarget(t);
  if (!target) return { match, outcome: "match-over" };

  const newDarts = [...t.currentDarts, dart];
  const turnFull = newDarts.length >= 3;
  if (!turnFull) {
    return { match: withTraining(match, { ...t, currentDarts: newDarts }), outcome: "dart" };
  }

  const hits = newDarts.filter((d) =>
    target.kind === "bull" ? dartHitsBull(d) : target.kind === "double" ? dartHitsDoubleTarget(d, target.n) : false,
  ).length;

  const round: TrainingRound = {
    target,
    darts: newDarts,
    hits,
    outcome: hits > 0 ? "hit" : "miss",
  };
  let next = commitRound(t, round);

  if (next.cursor >= 21) {
    next = { ...next, finished: true, finalKind: "complete" };
    return finishTraining(match, next);
  }
  return { match: withTraining(match, next), outcome: "turn-end" };
}

function applyDartBobs27(match: Match, dart: Dart): { match: Match; outcome: ApplyOutcome } {
  const t = match.training!;
  const target = trainingCurrentTarget(t);
  if (!target || target.kind !== "double") return { match, outcome: "match-over" };

  const newDarts = [...t.currentDarts, dart];
  const turnFull = newDarts.length >= 3;
  if (!turnFull) {
    return { match: withTraining(match, { ...t, currentDarts: newDarts }), outcome: "dart" };
  }

  const n = target.n;
  const hits = newDarts.filter((d) => dartHitsDoubleTarget(d, n)).length;
  const delta = hits > 0 ? hits * 2 * n : -2 * n;
  const newScore = t.score + delta;

  const bust = newScore <= 0;

  const round: TrainingRound = {
    target,
    darts: newDarts,
    hits,
    outcome: bust ? "bobs-bust" : hits > 0 ? "hit" : "miss",
    scoreAfter: newScore,
  };
  let next = commitRound(t, round);
  next = { ...next, score: newScore };

  if (bust) {
    next = { ...next, finished: true, finalKind: "bust" };
    return finishTraining(match, next);
  }
  if (next.cursor >= 20) {
    next = { ...next, finished: true, finalKind: "complete" };
    return finishTraining(match, next);
  }
  return { match: withTraining(match, next), outcome: "turn-end" };
}

function applyDartCheckout(match: Match, dart: Dart): { match: Match; outcome: ApplyOutcome } {
  const t = match.training!;
  const target = trainingCurrentTarget(t);
  if (!target || target.kind !== "checkout") return { match, outcome: "match-over" };

  const startRemaining = target.remaining;
  const newDarts = [...t.currentDarts, dart];

  // Compute remaining after each dart, applying double-out rules locally.
  let rem = startRemaining;
  let success = false;
  let bust = false;
  for (const d of newDarts) {
    const after = rem - d.score;
    if (after < 0) { bust = true; break; }
    if (after === 0) {
      if (isDouble(d)) { success = true; rem = 0; break; }
      bust = true; break;
    }
    if (after === 1) { bust = true; break; }
    rem = after;
  }

  const turnFull = newDarts.length >= 3;
  const finalize = success || bust || turnFull;
  if (!finalize) {
    return { match: withTraining(match, { ...t, currentDarts: newDarts }), outcome: "dart" };
  }

  const round: TrainingRound = {
    target,
    darts: newDarts,
    hits: success ? 1 : 0,
    outcome: success ? "checkout-success" : "checkout-fail",
    finishDarts: success ? newDarts.length : undefined,
  };
  let next = commitRound(t, round);

  const total = t.scenarios?.length ?? 0;
  if (next.cursor >= total) {
    next = { ...next, finished: true, finalKind: "complete" };
    return finishTraining(match, next);
  }
  return { match: withTraining(match, next), outcome: success ? "leg-won" : "turn-end" };
}

function finishTraining(match: Match, next: TrainingState): { match: Match; outcome: ApplyOutcome } {
  return {
    match: { ...match, training: next, winner: 0, endedAt: Date.now() },
    outcome: "match-won",
  };
}

// ─── Checkout scenario generator ──────────────────────────────────

const COMMON_FINISHES_SUPP = [40, 36, 32, 28, 24, 20, 16, 12, 8, 50, 41, 45, 60, 65, 80, 85];

export function generateCheckoutScenarios(n: number, seed?: number): number[] {
  // Pool: curated finishes from CHECKOUTS_DOUBLE plus common doubles & odd setups.
  const pool = new Set<number>();
  for (const k of Object.keys(CHECKOUTS_DOUBLE)) {
    const v = Number(k);
    if (v >= 41 && v <= 170) pool.add(v);
  }
  for (const v of COMMON_FINISHES_SUPP) pool.add(v);
  const arr = Array.from(pool);

  // Simple seeded PRNG (mulberry32) so sessions feel deterministic-ish.
  let s = seed ?? Date.now() & 0xffffffff;
  const rand = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Fisher-Yates partial shuffle.
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, Math.min(n, arr.length));
}

// ─── Training stats ───────────────────────────────────────────────

export function computeTrainingStats(state: TrainingState): TrainingStats {
  const totalDarts = state.rounds.reduce((a, r) => a + r.darts.length, 0);
  let hits = 0;
  let attempts = state.rounds.length;
  let longestStreak = 0;
  let currentStreak = 0;
  let bestFinish = 0;
  let finishDartsTotal = 0;
  let successCount = 0;

  if (state.drill === "checkout") {
    for (const r of state.rounds) {
      const ok = r.outcome === "checkout-success";
      if (ok) {
        hits++;
        successCount++;
        finishDartsTotal += r.finishDarts ?? 0;
        if (r.target.kind === "checkout" && r.target.remaining > bestFinish) {
          bestFinish = r.target.remaining;
        }
        currentStreak++;
        if (currentStreak > longestStreak) longestStreak = currentStreak;
      } else {
        currentStreak = 0;
      }
    }
  } else {
    for (const r of state.rounds) {
      hits += r.hits;
      if (r.hits > 0) {
        currentStreak++;
        if (currentStreak > longestStreak) longestStreak = currentStreak;
      } else {
        currentStreak = 0;
      }
    }
  }

  const stats: TrainingStats = {
    drill: state.drill,
    totalDarts,
    hits,
    attempts,
    accuracyPct:
      state.drill === "checkout"
        ? attempts > 0 ? (hits / attempts) * 100 : 0
        : totalDarts > 0 ? (hits / totalDarts) * 100 : 0,
    longestStreak,
    finalKind: state.finalKind,
  };
  if (state.drill === "bobs27") stats.finalScore = state.score;
  if (state.drill === "checkout") {
    stats.avgFinishDarts = successCount > 0 ? finishDartsTotal / successCount : 0;
    stats.bestFinish = bestFinish;
  }
  return stats;
}

// ─── Undo ─────────────────────────────────────────────────────────

export function undoLastDart(match: Match): Match {
  if (match.winner !== null) return match;
  if (match.config.mode === "training" && match.training) {
    if (match.training.currentDarts.length === 0) return match;
    return {
      ...match,
      training: {
        ...match.training,
        currentDarts: match.training.currentDarts.slice(0, -1),
      },
    };
  }
  const leg = match.currentLeg;
  if (leg.currentTurnDarts.length > 0) {
    return {
      ...match,
      currentLeg: { ...leg, currentTurnDarts: leg.currentTurnDarts.slice(0, -1) },
    };
  }
  const lastPlayer = (1 - leg.currentPlayer) as 0 | 1;
  if (leg.turns[lastPlayer].length === 0) return match;
  const popped = leg.turns[lastPlayer][leg.turns[lastPlayer].length - 1];
  return {
    ...match,
    currentLeg: {
      ...leg,
      turns: leg.turns.map((arr, i) =>
        i === lastPlayer ? arr.slice(0, -1) : arr,
      ) as [Turn[], Turn[]],
      remaining: leg.remaining.map((r, i) =>
        i === lastPlayer ? popped.remainingBefore : r,
      ) as [number, number],
      atcProgress: match.config.mode === "atc"
        ? leg.atcProgress.map((v, i) =>
            i === lastPlayer ? (popped.atcProgressBefore ?? 1) : v,
          ) as [number, number]
        : leg.atcProgress,
      currentPlayer: lastPlayer,
      currentTurnDarts: popped.darts.slice(0, -1),
    },
  };
}

// ─── Stats ────────────────────────────────────────────────────────

export function computeStats(match: Match): [PlayerStats, PlayerStats] {
  const allLegs = [...match.legHistory, match.currentLeg];

  const compute = (p: 0 | 1): PlayerStats => {
    let totalScore = 0, totalDarts = 0;
    let doubles = 0, triples = 0, bulls25 = 0, bullseyes = 0, misses = 0;
    let tons = 0, tonForty = 0, tonEighty = 0;
    let bestFinish = 0, highestTurn = 0;

    for (const leg of allLegs) {
      for (const turn of leg.turns[p]) {
        totalScore += turn.total;
        totalDarts += turn.countedDartsCount;
        if (turn.kind === "win" && turn.total > bestFinish) bestFinish = turn.total;
        if (turn.kind !== "bust") {
          if (turn.total > highestTurn) highestTurn = turn.total;
          if (turn.total >= 180) tonEighty++;
          else if (turn.total >= 140) tonForty++;
          else if (turn.total >= 100) tons++;
        }
        for (const d of turn.darts) {
          if (d.score === 0) misses++;
          if (d.multiplier === 3) triples++;
          if (d.multiplier === 2) {
            doubles++;
            if (d.number === 25) bullseyes++;
          }
          if (d.multiplier === 1 && d.number === 25) bulls25++;
        }
      }
    }
    const threeDartAvg = totalDarts > 0 ? (totalScore / totalDarts) * 3 : 0;
    return {
      threeDartAvg, totalDarts, totalScore,
      doubles, triples, bulls25, bullseyes, misses,
      tons, tonForty, tonEighty,
      bestFinish, highestTurn,
      legsWon: match.legsWon[p],
    };
  };

  return [compute(0), compute(1)];
}

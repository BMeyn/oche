// lib/scoring.ts — pure scoring engine for X01 and High-Low
import type {
  Dart, Multiplier, Turn, Leg, Match, MatchConfig,
  ApplyOutcome, PlayerStats,
} from "./types";

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
  return {
    config: { ...config, startingScore },
    currentLeg: makeFreshLeg(1, 0, startingScore),
    legsWon: [0, 0],
    legHistory: [],
    winner: null,
    startedAt: Date.now(),
  };
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
  };
}

// ─── Live (in-progress) remaining for the active player ────────────

export function displayRemaining(match: Match, p: 0 | 1): number {
  const leg = match.currentLeg;
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
  if (match.config.mode === "highlow") return applyDartHighLow(match, dart);
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

// ─── Undo ─────────────────────────────────────────────────────────

export function undoLastDart(match: Match): Match {
  if (match.winner !== null) return match;
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

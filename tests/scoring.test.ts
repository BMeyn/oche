// tests/scoring.test.ts
import { describe, expect, it } from "vitest";
import {
  applyDart, createMatch, displayRemaining, makeDart,
  undoLastDart, computeStats, sumDarts,
  computeTrainingStats, generateCheckoutScenarios,
} from "../lib/scoring";
import type { Match, MatchConfig } from "../lib/types";

const T = (n: number) => makeDart(3, n);
const D = (n: number) => makeDart(2, n);
const S = (n: number) => makeDart(1, n);
const BULL = makeDart(2, 25);
const OUTER = makeDart(1, 25);
const MISS = makeDart(1, 0);

const baseConfig = {
  players: ["Alice", "Bob"] as [string, string],
  legsToWin: 3,
  mode: "x01" as const,
  startingScore: 501,
  inRule: "straight" as const,
  outRule: "double" as const,
};

function throwMany(match: Match, darts: ReturnType<typeof S>[]): Match {
  let m = match;
  for (const d of darts) {
    m = applyDart(m, d).match;
  }
  return m;
}

describe("makeDart", () => {
  it("labels triples, doubles, singles, bull, outer, miss", () => {
    expect(T(20).label).toBe("T20");
    expect(D(16).label).toBe("D16");
    expect(S(5).label).toBe("5");
    expect(BULL.label).toBe("BULL");
    expect(OUTER.label).toBe("25");
    expect(MISS.label).toBe("MISS");
  });
  it("computes score correctly", () => {
    expect(T(20).score).toBe(60);
    expect(D(16).score).toBe(32);
    expect(BULL.score).toBe(50);
    expect(OUTER.score).toBe(25);
    expect(MISS.score).toBe(0);
  });
});

describe("X01 — straight scoring", () => {
  it("subtracts each dart and switches player after 3", () => {
    let m = createMatch(baseConfig);
    expect(displayRemaining(m, 0)).toBe(501);

    ({ match: m } = applyDart(m, T(20))); // 441
    ({ match: m } = applyDart(m, T(20))); // 381
    expect(displayRemaining(m, 0)).toBe(381);
    expect(m.currentLeg.currentPlayer).toBe(0);

    ({ match: m } = applyDart(m, T(20))); // 321 - turn ends
    expect(m.currentLeg.remaining[0]).toBe(321);
    expect(m.currentLeg.currentPlayer).toBe(1);
    expect(m.currentLeg.turns[0]).toHaveLength(1);
    expect(m.currentLeg.turns[0][0].total).toBe(180);
  });

  it("180 records as ton-eighty", () => {
    let m = createMatch(baseConfig);
    m = throwMany(m, [T(20), T(20), T(20)]);
    const stats = computeStats(m);
    expect(stats[0].tonEighty).toBe(1);
    expect(stats[0].threeDartAvg).toBe(180);
  });
});

describe("X01 — double-out", () => {
  it("ends the leg when checkout dart is a double leaving 0", () => {
    // Get to 40 then D20
    let m = createMatch({ ...baseConfig, startingScore: 100 });
    ({ match: m } = applyDart(m, T(20))); // 40
    ({ match: m } = applyDart(m, D(20))); // 0 win
    expect(m.legsWon[0]).toBe(1);
    expect(m.currentLeg.number).toBe(2);
  });

  it("BUST when finishing on a single", () => {
    let m = createMatch({ ...baseConfig, startingScore: 40 });
    ({ match: m } = applyDart(m, S(20))); // 20
    const before = m.currentLeg.remaining[0];
    ({ match: m } = applyDart(m, S(20))); // would land on 0 with single -> bust
    // Bust: turn ends, remaining unchanged from start of turn, switch player
    expect(m.legsWon[0]).toBe(0);
  });

  it("BUST when leaving 1", () => {
    let m = createMatch({ ...baseConfig, startingScore: 40 });
    ({ match: m } = applyDart(m, T(13))); // 1 -> bust
    // Turn ends, player swaps, remaining unchanged
    expect(m.currentLeg.remaining[0]).toBe(40);
    expect(m.currentLeg.currentPlayer).toBe(1);
    expect(m.currentLeg.turns[0][0].kind).toBe("bust");
    expect(m.currentLeg.turns[0][0].total).toBe(0);
  });

  it("BUST when going below zero", () => {
    let m = createMatch({ ...baseConfig, startingScore: 20 });
    ({ match: m } = applyDart(m, T(20))); // -40 -> bust
    expect(m.currentLeg.remaining[0]).toBe(20);
    expect(m.currentLeg.turns[0][0].kind).toBe("bust");
  });

  it("BULL counts as double for checkout", () => {
    let m = createMatch({ ...baseConfig, startingScore: 50 });
    ({ match: m } = applyDart(m, BULL)); // win
    expect(m.legsWon[0]).toBe(1);
  });

  it("alternates leg starter", () => {
    let m = createMatch({ ...baseConfig, legsToWin: 5, startingScore: 40 });
    expect(m.currentLeg.startingPlayer).toBe(0);
    ({ match: m } = applyDart(m, D(20))); // P0 wins leg 1
    expect(m.currentLeg.startingPlayer).toBe(1);
    expect(m.currentLeg.currentPlayer).toBe(1);
  });

  it("declares match winner at first-to-N", () => {
    let m = createMatch({ ...baseConfig, legsToWin: 2, startingScore: 40 });
    ({ match: m } = applyDart(m, D(20))); // P0 wins leg 1
    // Leg 2 starts with P1 — make P0 win again by giving P1 a bust + then P0 throws
    ({ match: m } = applyDart(m, T(13))); // P1 bust on 40 -> turn ends, P0 to throw
    ({ match: m } = applyDart(m, D(20))); // P0 wins leg 2
    expect(m.winner).toBe(0);
    expect(m.endedAt).toBeDefined();
  });
});

describe("X01 — straight-out", () => {
  it("any dart that lands on 0 wins", () => {
    let m = createMatch({ ...baseConfig, outRule: "straight", startingScore: 40 });
    ({ match: m } = applyDart(m, S(20))); // 20
    ({ match: m } = applyDart(m, S(20))); // 0 win
    expect(m.legsWon[0]).toBe(1);
  });

  it("triple finish wins under straight-out", () => {
    let m = createMatch({ ...baseConfig, outRule: "straight", startingScore: 60 });
    ({ match: m } = applyDart(m, T(20))); // 0 win
    expect(m.legsWon[0]).toBe(1);
  });

  it("leaving 1 is fine (not bust) under straight-out", () => {
    let m = createMatch({ ...baseConfig, outRule: "straight", startingScore: 40 });
    ({ match: m } = applyDart(m, T(13))); // mid-turn
    expect(displayRemaining(m, 0)).toBe(1);
    expect(m.currentLeg.currentPlayer).toBe(0); // still our turn (not bust)
    ({ match: m } = applyDart(m, MISS));
    ({ match: m } = applyDart(m, MISS)); // turn ends with 1 remaining
    expect(m.currentLeg.remaining[0]).toBe(1);
    expect(m.currentLeg.turns[0][0].kind).toBe("ok");
  });
});

describe("X01 — master-out", () => {
  it("triple finish wins", () => {
    let m = createMatch({ ...baseConfig, outRule: "master", startingScore: 60 });
    ({ match: m } = applyDart(m, T(20))); // 0 win on triple
    expect(m.legsWon[0]).toBe(1);
  });

  it("double finish still wins", () => {
    let m = createMatch({ ...baseConfig, outRule: "master", startingScore: 40 });
    ({ match: m } = applyDart(m, D(20))); // 0 win on double
    expect(m.legsWon[0]).toBe(1);
  });

  it("single finish busts", () => {
    let m = createMatch({ ...baseConfig, outRule: "master", startingScore: 40 });
    ({ match: m } = applyDart(m, S(20))); // 20
    ({ match: m } = applyDart(m, S(20))); // 0 with single -> bust
    expect(m.legsWon[0]).toBe(0);
    expect(m.currentLeg.turns[0][0].kind).toBe("bust");
  });
});

describe("X01 — double-in", () => {
  it("singles before opening double don't reduce score", () => {
    let m = createMatch({ ...baseConfig, inRule: "double", startingScore: 100 });
    ({ match: m } = applyDart(m, S(20))); // doesn't count
    ({ match: m } = applyDart(m, S(20))); // doesn't count
    ({ match: m } = applyDart(m, S(20))); // doesn't count, turn ends
    expect(m.currentLeg.remaining[0]).toBe(100);
    expect(m.currentLeg.hasStarted[0]).toBe(false);
  });

  it("starts on first double; subsequent darts count", () => {
    let m = createMatch({ ...baseConfig, inRule: "double", startingScore: 100 });
    ({ match: m } = applyDart(m, S(5))); // doesn't count
    ({ match: m } = applyDart(m, D(10))); // 20 -> opens, scores 20 -> 80
    ({ match: m } = applyDart(m, S(20))); // counts -> 60
    expect(m.currentLeg.hasStarted[0]).toBe(true);
    expect(m.currentLeg.remaining[0]).toBe(60);
  });

  it("doesn't pollute average with un-started darts", () => {
    let m = createMatch({ ...baseConfig, inRule: "double", startingScore: 100 });
    m = throwMany(m, [S(5), S(5), S(5)]); // 3 darts, none counted
    const stats = computeStats(m);
    expect(stats[0].totalDarts).toBe(0);
    expect(stats[0].threeDartAvg).toBe(0);
  });
});

describe("Undo", () => {
  it("undoes a dart within the current turn", () => {
    let m = createMatch(baseConfig);
    ({ match: m } = applyDart(m, T(20)));
    ({ match: m } = applyDart(m, T(20)));
    expect(displayRemaining(m, 0)).toBe(381);
    m = undoLastDart(m);
    expect(displayRemaining(m, 0)).toBe(441);
  });

  it("undoes across turn boundary", () => {
    let m = createMatch(baseConfig);
    m = throwMany(m, [T(20), T(20), T(20)]); // turn 1 done, P1 to throw
    expect(m.currentLeg.currentPlayer).toBe(1);
    expect(m.currentLeg.remaining[0]).toBe(321);
    m = undoLastDart(m);
    // Restored to P0 with 2 darts in current turn
    expect(m.currentLeg.currentPlayer).toBe(0);
    expect(m.currentLeg.currentTurnDarts).toHaveLength(2);
    expect(m.currentLeg.remaining[0]).toBe(501);
  });
});

describe("High-Low", () => {
  it("higher 3-dart total wins the leg", () => {
    let m = createMatch({
      players: ["Alice", "Bob"],
      legsToWin: 1,
      mode: "highlow",
      startingScore: 0,
    });
    m = throwMany(m, [T(20), T(20), T(20)]); // P0 = 180
    m = throwMany(m, [S(1), S(1), S(1)]);    // P1 = 3
    expect(m.winner).toBe(0);
    expect(m.legsWon[0]).toBe(1);
  });
});

describe("Stats sanity", () => {
  it("counts triples, doubles, bulls, misses correctly", () => {
    let m = createMatch(baseConfig);
    m = throwMany(m, [T(20), D(20), MISS]);
    const stats = computeStats(m);
    expect(stats[0].triples).toBe(1);
    expect(stats[0].doubles).toBe(1);
    expect(stats[0].misses).toBe(1);
    expect(stats[0].totalDarts).toBe(3);
    // 100 total / 3 darts * 3 = 100
    expect(stats[0].threeDartAvg).toBe(100);
  });
});

// ─── Training mode ────────────────────────────────────────────────

const trainingBase = (drill: "doubles" | "bobs27" | "checkout", extras: Partial<MatchConfig> = {}): MatchConfig => ({
  players: ["You", ""],
  legsToWin: 1,
  mode: "training",
  startingScore: 0,
  drill,
  ...extras,
});

describe("Training: Doubles Practice", () => {
  it("starts at D1 and advances cursor every 3 darts", () => {
    let m = createMatch(trainingBase("doubles"));
    expect(m.training?.cursor).toBe(0);
    m = throwMany(m, [D(1), MISS, MISS]);
    expect(m.training?.cursor).toBe(1);
    expect(m.training?.rounds).toHaveLength(1);
    expect(m.training?.rounds[0].hits).toBe(1);
    expect(m.training?.rounds[0].outcome).toBe("hit");
  });

  it("only counts hits matching the current target", () => {
    let m = createMatch(trainingBase("doubles"));
    // cursor=0 → target D1; D5 should NOT count
    m = throwMany(m, [D(5), D(5), D(5)]);
    expect(m.training?.rounds[0].hits).toBe(0);
    expect(m.training?.rounds[0].outcome).toBe("miss");
  });

  it("advances regardless of hit/miss", () => {
    let m = createMatch(trainingBase("doubles"));
    m = throwMany(m, [MISS, MISS, MISS]);
    expect(m.training?.cursor).toBe(1);
    m = throwMany(m, [MISS, MISS, MISS]);
    expect(m.training?.cursor).toBe(2);
  });

  it("BULL is the final target and finishes the drill", () => {
    let m = createMatch(trainingBase("doubles"));
    // Skip through D1..D20 with all misses (20 rounds × 3 darts).
    for (let i = 0; i < 20; i++) {
      m = throwMany(m, [MISS, MISS, MISS]);
    }
    expect(m.training?.cursor).toBe(20);
    expect(m.training?.finished).toBe(false);
    // BULL round
    m = throwMany(m, [BULL, MISS, MISS]);
    expect(m.training?.cursor).toBe(21);
    expect(m.training?.finished).toBe(true);
    expect(m.training?.finalKind).toBe("complete");
    expect(m.winner).toBe(0);
    // BULL hit counted
    expect(m.training?.rounds[20].hits).toBe(1);
  });
});

describe("Training: Bobs 27", () => {
  it("starts at score 27 and gains 2*n per hit", () => {
    let m = createMatch(trainingBase("bobs27"));
    expect(m.training?.score).toBe(27);
    // D1 round: 1 hit = +2
    m = throwMany(m, [D(1), MISS, MISS]);
    expect(m.training?.score).toBe(29);
    expect(m.training?.rounds[0].scoreAfter).toBe(29);
  });

  it("loses 2*n when all 3 darts miss", () => {
    let m = createMatch(trainingBase("bobs27"));
    m = throwMany(m, [MISS, MISS, MISS]); // D1 missed → -2
    expect(m.training?.score).toBe(25);
  });

  it("busts when score drops to or below 0", () => {
    let m = createMatch(trainingBase("bobs27"));
    // 27 - 2 - 4 - 6 - 8 - 10 = -3 by D5 round (missed)
    m = throwMany(m, [MISS, MISS, MISS]); // D1 → 25
    m = throwMany(m, [MISS, MISS, MISS]); // D2 → 21
    m = throwMany(m, [MISS, MISS, MISS]); // D3 → 15
    m = throwMany(m, [MISS, MISS, MISS]); // D4 → 7
    m = throwMany(m, [MISS, MISS, MISS]); // D5 → -3 BUST
    expect(m.training?.finished).toBe(true);
    expect(m.training?.finalKind).toBe("bust");
    expect(m.winner).toBe(0);
  });

  it("completes after D20 round", () => {
    let m = createMatch(trainingBase("bobs27"));
    // Hit each double once → +2*n per round, plenty to stay positive
    for (let n = 1; n <= 20; n++) {
      m = throwMany(m, [D(n), MISS, MISS]);
    }
    expect(m.training?.finished).toBe(true);
    expect(m.training?.finalKind).toBe("complete");
    // 27 + 2*sum(1..20) = 27 + 420 = 447
    expect(m.training?.score).toBe(447);
  });
});

describe("Training: Checkout Practice", () => {
  it("succeeds on a 1-dart double-out finish", () => {
    let m = createMatch(trainingBase("checkout", { scenarioCount: 3 }));
    // Force a known scenario: replace scenarios with [40, 32, 50]
    m = { ...m, training: { ...m.training!, scenarios: [40, 32, 50] } };
    m = throwMany(m, [D(20)]); // 40 - 40 = 0 on a double → success after 1 dart
    expect(m.training?.cursor).toBe(1);
    expect(m.training?.rounds[0].outcome).toBe("checkout-success");
    expect(m.training?.rounds[0].finishDarts).toBe(1);
  });

  it("busts when landing on 1 (impossible double-out)", () => {
    let m = createMatch(trainingBase("checkout", { scenarioCount: 1 }));
    m = { ...m, training: { ...m.training!, scenarios: [40] } };
    // 40 - 39 = 1 → bust
    m = throwMany(m, [T(13)]); // T13 = 39
    expect(m.training?.cursor).toBe(1);
    expect(m.training?.rounds[0].outcome).toBe("checkout-fail");
    expect(m.training?.finished).toBe(true);
  });

  it("busts when overshooting", () => {
    let m = createMatch(trainingBase("checkout", { scenarioCount: 1 }));
    m = { ...m, training: { ...m.training!, scenarios: [40] } };
    // 40 → S20 (20 left) → S20 (0 left, but not double) → bust
    m = throwMany(m, [S(20), S(20)]);
    // Lands on 0 without double = bust → fail, drill ends
    expect(m.training?.rounds[0].outcome).toBe("checkout-fail");
  });

  it("auto-advances after 3 darts without finish", () => {
    let m = createMatch(trainingBase("checkout", { scenarioCount: 2 }));
    m = { ...m, training: { ...m.training!, scenarios: [60, 40] } };
    m = throwMany(m, [S(10), S(10), S(10)]); // 60 → 50 → 40 → 30, no finish
    expect(m.training?.cursor).toBe(1);
    expect(m.training?.rounds[0].outcome).toBe("checkout-fail");
  });

  it("finishes after the last scenario", () => {
    let m = createMatch(trainingBase("checkout", { scenarioCount: 2 }));
    m = { ...m, training: { ...m.training!, scenarios: [40, 32] } };
    m = throwMany(m, [D(20)]); // scenario 1 success
    m = throwMany(m, [D(16)]); // scenario 2 success
    expect(m.training?.finished).toBe(true);
    expect(m.winner).toBe(0);
    const stats = computeTrainingStats(m.training!);
    expect(stats.hits).toBe(2);
    expect(stats.attempts).toBe(2);
    expect(stats.avgFinishDarts).toBe(1);
  });
});

describe("Training: undo and helpers", () => {
  it("undoes only within the current turn", () => {
    let m = createMatch(trainingBase("doubles"));
    m = throwMany(m, [D(1), MISS]);
    expect(m.training?.currentDarts).toHaveLength(2);
    m = undoLastDart(m);
    expect(m.training?.currentDarts).toHaveLength(1);
    m = undoLastDart(m);
    expect(m.training?.currentDarts).toHaveLength(0);
    // No-op when nothing to undo
    const before = m;
    m = undoLastDart(m);
    expect(m).toBe(before);
  });

  it("computeStats returns zeros for training mode", () => {
    let m = createMatch(trainingBase("doubles"));
    m = throwMany(m, [D(1), D(1), D(1)]);
    const [s0] = computeStats(m);
    expect(s0.totalDarts).toBe(0);
    expect(s0.threeDartAvg).toBe(0);
  });

  it("generateCheckoutScenarios returns N values in checkout range", () => {
    const scen = generateCheckoutScenarios(8, 42);
    expect(scen).toHaveLength(8);
    for (const v of scen) {
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(170);
    }
  });
});

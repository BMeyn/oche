// lib/checkouts.ts — verified 1/2/3-dart finishes with programmatic fallback
import type { OutRule } from "./types";

export const CHECKOUTS_DOUBLE: Record<number, string[]> = {
  170: ["T20", "T20", "BULL"], 167: ["T20", "T19", "BULL"], 164: ["T20", "T18", "BULL"],
  161: ["T20", "T17", "BULL"], 160: ["T20", "T20", "D20"],  158: ["T20", "T20", "D19"],
  157: ["T20", "T19", "D20"],  156: ["T20", "T20", "D18"],  155: ["T20", "T19", "D19"],
  154: ["T20", "T18", "D20"],  153: ["T20", "T19", "D18"],  152: ["T20", "T20", "D16"],
  151: ["T20", "T17", "D20"],  150: ["T20", "T18", "D18"],  149: ["T20", "T19", "D16"],
  148: ["T20", "T16", "D20"],  147: ["T20", "T17", "D18"],  146: ["T20", "T18", "D16"],
  145: ["T20", "T15", "D20"],  144: ["T20", "T20", "D12"],  143: ["T20", "T17", "D16"],
  142: ["T20", "T14", "D20"],  141: ["T20", "T19", "D12"],  140: ["T20", "T20", "D10"],
  139: ["T19", "T14", "D20"],  138: ["T20", "T18", "D12"],  137: ["T20", "T15", "D16"],
  136: ["T20", "T20", "D8"],   135: ["T20", "T17", "D12"],  134: ["T20", "T14", "D16"],
  133: ["T20", "T19", "D8"],   132: ["BULL", "BULL", "D16"],131: ["T20", "T13", "D16"],
  130: ["T20", "T18", "D8"],   129: ["T19", "T16", "D12"],  128: ["T18", "T14", "D16"],
  127: ["T20", "T17", "D8"],   126: ["T19", "T19", "D6"],   125: ["BULL", "T17", "D12"],
  124: ["T20", "T16", "D8"],   123: ["T19", "T16", "D9"],   121: ["T20", "T11", "D14"],
  120: ["T20", "20", "D20"],   116: ["T20", "16", "D20"],   110: ["T20", "10", "D20"],
  100: ["T20", "D20"], 98: ["T20", "D19"], 96: ["T20", "D18"], 94: ["T18", "D20"],
  90:  ["T20", "D15"], 84: ["T20", "D12"], 81: ["T19", "D12"], 80: ["T20", "D10"],
  76:  ["T20", "D8"],  72: ["T16", "D12"], 70: ["T18", "D8"],  60: ["20", "D20"],
  56:  ["16", "D20"],  50: ["BULL"],       40: ["D20"], 38: ["D19"], 36: ["D18"],
  34:  ["D17"], 32: ["D16"], 30: ["D15"], 28: ["D14"], 26: ["D13"], 24: ["D12"], 22: ["D11"],
  20:  ["D10"], 18: ["D9"], 16: ["D8"], 14: ["D7"], 12: ["D6"], 10: ["D5"], 8: ["D4"],
  6:   ["D3"], 4: ["D2"], 2: ["D1"],
};

// Single-dart finisher: the label of a dart that lands `score` and satisfies `outRule`.
// double:   D1..D20, BULL
// master:   D1..D20, T1..T20, BULL
// straight: any single dart landing the value (S1..S20, S25, D1..D20, T1..T20, BULL)
function finisherLabel(score: number, outRule: OutRule): string | null {
  if (score === 50) return "BULL";
  if (score >= 2 && score <= 40 && score % 2 === 0) return `D${score / 2}`;
  if (outRule === "master") {
    if (score >= 3 && score <= 60 && score % 3 === 0) return `T${score / 3}`;
    return null;
  }
  if (outRule === "straight") {
    if (score >= 1 && score <= 20) return `${score}`;
    if (score === 25) return "25";
    if (score >= 3 && score <= 60 && score % 3 === 0) return `T${score / 3}`;
    return null;
  }
  return null;
}

// Setup-dart catalog used by the 2-dart fallback. Order biases toward natural
// suggestions: low singles first (so 41 → "1, D20" rather than "T13, D1"),
// then triples high→low, then bull, 25, doubles.
const SETUP_DARTS: Array<[number, string]> = (() => {
  const out: Array<[number, string]> = [];
  for (let n = 1; n <= 20; n++) out.push([n, `${n}`]);
  for (let n = 20; n >= 1; n--) out.push([n * 3, `T${n}`]);
  out.push([50, "BULL"]);
  out.push([25, "25"]);
  for (let n = 20; n >= 1; n--) out.push([n * 2, `D${n}`]);
  return out;
})();

function find2DartFinish(remaining: number, outRule: OutRule): string[] | null {
  for (const [score, label] of SETUP_DARTS) {
    const rem = remaining - score;
    if (rem <= 0) continue;
    const fin = finisherLabel(rem, outRule);
    if (fin) return [label, fin];
  }
  return null;
}

function find3DartFinish(remaining: number, outRule: OutRule): string[] | null {
  // Prefer a triple as the first dart — that's the natural 3-dart setup.
  for (let n = 20; n >= 1; n--) {
    const after1 = remaining - n * 3;
    if (after1 <= 1) continue;
    const two = find2DartFinish(after1, outRule);
    if (two) return [`T${n}`, ...two];
  }
  // Fallback: any other setup dart.
  for (const [score, label] of SETUP_DARTS) {
    if (label.startsWith("T")) continue;
    const after1 = remaining - score;
    if (after1 <= 1) continue;
    const two = find2DartFinish(after1, outRule);
    if (two) return [label, ...two];
  }
  return null;
}

export function checkoutHint(remaining: number, outRule: OutRule): string[] | null {
  if (remaining <= 0) return null;
  if (remaining > 170) return null;

  // 1-dart finish (covers D1..D20 / BULL, plus singles & triples for straight/master).
  const oneDart = finisherLabel(remaining, outRule);
  if (oneDart) return [oneDart];

  // Curated 3-dart routes (optimal-tuned). Apply to double and master out;
  // for straight-out we'd rather show a straight-finishable path via fallback.
  if (outRule !== "straight" && CHECKOUTS_DOUBLE[remaining]) {
    return CHECKOUTS_DOUBLE[remaining];
  }

  // 2-dart fallback fills the gaps between the curated table and 1-dart finishes.
  const two = find2DartFinish(remaining, outRule);
  if (two) return two;

  // 3-dart fallback for any value the curated table missed (rare).
  return find3DartFinish(remaining, outRule);
}

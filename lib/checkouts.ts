// lib/checkouts.ts — verified 1/2/3-dart double-out finishes
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

export function checkoutHint(remaining: number, outRule: OutRule): string[] | null {
  if (remaining <= 0) return null;
  if (outRule === "double" || outRule === "master") {
    return CHECKOUTS_DOUBLE[remaining] || null;
  }
  // straight-out: simple finishes
  if (remaining === 50) return ["BULL"];
  if (remaining <= 20) return [`${remaining}`];
  if (remaining <= 40 && remaining % 2 === 0) return [`D${remaining / 2}`];
  // fall back to double-out hints
  return CHECKOUTS_DOUBLE[remaining] || null;
}

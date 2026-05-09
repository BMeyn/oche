import { describe, expect, it } from "vitest";
import { isValidMatch } from "../lib/validation";
import { createMatch } from "../lib/scoring";

const baseConfig = {
  players: ["Alice", "Bob"] as [string, string],
  legsToWin: 3,
  mode: "x01" as const,
  startingScore: 501,
  inRule: "straight" as const,
  outRule: "double" as const,
};

describe("isValidMatch", () => {
  it("accepts a freshly-created match", () => {
    expect(isValidMatch(createMatch(baseConfig))).toBe(true);
  });

  it("rejects non-objects", () => {
    expect(isValidMatch(null)).toBe(false);
    expect(isValidMatch(undefined)).toBe(false);
    expect(isValidMatch("match")).toBe(false);
    expect(isValidMatch(42)).toBe(false);
    expect(isValidMatch([])).toBe(false);
  });

  it("rejects when config or currentLeg is missing", () => {
    const m = createMatch(baseConfig) as unknown as Record<string, unknown>;
    expect(isValidMatch({ ...m, config: undefined })).toBe(false);
    expect(isValidMatch({ ...m, currentLeg: null })).toBe(false);
  });

  it("rejects legsWon that is not a length-2 number tuple", () => {
    const m = createMatch(baseConfig) as unknown as Record<string, unknown>;
    expect(isValidMatch({ ...m, legsWon: [0] })).toBe(false);
    expect(isValidMatch({ ...m, legsWon: [0, 0, 0] })).toBe(false);
    expect(isValidMatch({ ...m, legsWon: [0, "1"] })).toBe(false);
    expect(isValidMatch({ ...m, legsWon: "0,0" })).toBe(false);
  });

  it("rejects winner outside {null, 0, 1}", () => {
    const m = createMatch(baseConfig) as unknown as Record<string, unknown>;
    expect(isValidMatch({ ...m, winner: 2 })).toBe(false);
    expect(isValidMatch({ ...m, winner: "0" })).toBe(false);
    expect(isValidMatch({ ...m, winner: undefined })).toBe(false);
  });

  it("rejects when legHistory is not an array", () => {
    const m = createMatch(baseConfig) as unknown as Record<string, unknown>;
    expect(isValidMatch({ ...m, legHistory: {} })).toBe(false);
    expect(isValidMatch({ ...m, legHistory: null })).toBe(false);
  });
});

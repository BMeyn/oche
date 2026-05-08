// tests/checkouts.test.ts
import { describe, expect, it } from "vitest";
import { checkoutHint } from "../lib/checkouts";

describe("checkoutHint — curated 3-dart table (regression guards)", () => {
  it("170 double-out → T20 T20 BULL", () => {
    expect(checkoutHint(170, "double")).toEqual(["T20", "T20", "BULL"]);
  });
  it("100 double-out → T20 D20", () => {
    expect(checkoutHint(100, "double")).toEqual(["T20", "D20"]);
  });
  it("60 double-out → 20 D20 (curated)", () => {
    expect(checkoutHint(60, "double")).toEqual(["20", "D20"]);
  });
});

describe("checkoutHint — 1-dart finishes", () => {
  it("40 double-out → D20", () => {
    expect(checkoutHint(40, "double")).toEqual(["D20"]);
  });
  it("50 double-out → BULL", () => {
    expect(checkoutHint(50, "double")).toEqual(["BULL"]);
  });
  it("2 double-out → D1", () => {
    expect(checkoutHint(2, "double")).toEqual(["D1"]);
  });
});

describe("checkoutHint — 2-dart fallback fills curated-table gaps", () => {
  it("41 double-out returns a valid 2-dart finish (was null before)", () => {
    const path = checkoutHint(41, "double");
    expect(path).not.toBeNull();
    expect(path!.length).toBe(2);
    expect(path![1]).toMatch(/^(D\d+|BULL)$/);
  });
  it("42 double-out returns a valid 2-dart finish", () => {
    const path = checkoutHint(42, "double");
    expect(path).not.toBeNull();
    expect(path!.length).toBe(2);
  });
  it("91 double-out returns a 2-dart finish ending on a double", () => {
    const path = checkoutHint(91, "double");
    expect(path).not.toBeNull();
    expect(path!.length).toBe(2);
    expect(path![1]).toMatch(/^(D\d+|BULL)$/);
  });
  it("92 double-out → T20 D16", () => {
    expect(checkoutHint(92, "double")).toEqual(["T20", "D16"]);
  });
});

describe("checkoutHint — 3-dart fallback for non-table values", () => {
  it("99 double-out returns a 3-dart finish ending on a double", () => {
    const path = checkoutHint(99, "double");
    expect(path).not.toBeNull();
    expect(path!.length).toBe(3);
    expect(path![2]).toMatch(/^(D\d+|BULL)$/);
  });
});

describe("checkoutHint — unreachable values return null", () => {
  it("169 double-out → null (no 3-dart double-out finish exists)", () => {
    expect(checkoutHint(169, "double")).toBeNull();
  });
  it("171 double-out → null (above maximum)", () => {
    expect(checkoutHint(171, "double")).toBeNull();
  });
  it("0 → null", () => {
    expect(checkoutHint(0, "double")).toBeNull();
  });
  it("1 double-out → null (bogey number)", () => {
    expect(checkoutHint(1, "double")).toBeNull();
  });
});

describe("checkoutHint — master-out allows triple finishes", () => {
  it("60 master-out → T20 (1-dart, more natural than 20+D20)", () => {
    expect(checkoutHint(60, "master")).toEqual(["T20"]);
  });
  it("3 master-out → T1", () => {
    expect(checkoutHint(3, "master")).toEqual(["T1"]);
  });
});

describe("checkoutHint — straight-out", () => {
  it("21 straight-out → T7 (1-dart)", () => {
    expect(checkoutHint(21, "straight")).toEqual(["T7"]);
  });
  it("17 straight-out → 17 (single)", () => {
    expect(checkoutHint(17, "straight")).toEqual(["17"]);
  });
  it("41 straight-out returns a valid path", () => {
    const path = checkoutHint(41, "straight");
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThanOrEqual(2);
  });
});

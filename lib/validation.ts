import type { Match } from "@/lib/types";

export function isValidMatch(value: unknown): value is Match {
  if (typeof value !== "object" || value === null) return false;
  const m = value as Record<string, unknown>;

  if (typeof m.config !== "object" || m.config === null) return false;
  if (typeof m.currentLeg !== "object" || m.currentLeg === null) return false;

  if (!Array.isArray(m.legsWon) || m.legsWon.length !== 2) return false;
  if (typeof m.legsWon[0] !== "number" || typeof m.legsWon[1] !== "number") return false;

  if (m.winner !== null && m.winner !== 0 && m.winner !== 1) return false;

  if (!Array.isArray(m.legHistory)) return false;

  return true;
}

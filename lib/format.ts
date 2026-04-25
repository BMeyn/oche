// lib/format.ts
import type { MatchConfig } from "./types";

export function ruleLabel(cfg: MatchConfig): string {
  if (cfg.mode !== "x01") return "HIGH-LOW";
  const i = cfg.inRule === "double" ? "DI" : "SI";
  const o = cfg.outRule === "double" ? "DO" : cfg.outRule === "master" ? "MO" : "SO";
  return `${i} / ${o}`;
}

export function initials(name: string): string {
  return name.split(" ").map((n) => n[0] ?? "").slice(0, 2).join("").toUpperCase();
}

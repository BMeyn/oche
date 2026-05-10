// lib/format.ts
import type { GameConfig, MatchConfig, TrainingDrill, TrainingTarget } from "./types";

export function gameLabel(config: GameConfig): string {
  if (config.mode === "training") return drillLabel(config.drill ?? "doubles");
  if (config.mode === "highlow") return "High-Low";
  const out =
    config.outRule === "double" ? "Double out" :
    config.outRule === "master" ? "Master out" : "Straight out";
  return `${config.startingScore} · ${out} · Best of ${config.legsToWin * 2 - 1}`;
}

export function ruleLabel(cfg: MatchConfig): string {
  if (cfg.mode === "training") return drillLabel(cfg.drill ?? "doubles").toUpperCase();
  if (cfg.mode !== "x01") return "HIGH-LOW";
  const i = cfg.inRule === "double" ? "DI" : "SI";
  const o = cfg.outRule === "double" ? "DO" : cfg.outRule === "master" ? "MO" : "SO";
  return `${i} / ${o}`;
}

export function drillLabel(drill: TrainingDrill): string {
  if (drill === "doubles") return "Doubles Practice";
  if (drill === "bobs27") return "Bobs 27";
  return "Checkout Practice";
}

export function targetLabel(t: TrainingTarget): string {
  if (t.kind === "bull") return "BULL";
  if (t.kind === "double") return `D${t.n}`;
  return `${t.remaining}`;
}

export function initials(name: string): string {
  return name.split(" ").map((n) => n[0] ?? "").slice(0, 2).join("").toUpperCase();
}

"use client";

import type { Dart, Match, TrainingState } from "@/lib/types";
import {
  trainingCurrentTarget, trainingTotalRounds, sumDarts,
} from "@/lib/scoring";
import { checkoutHint } from "@/lib/checkouts";
import { drillLabel, targetLabel } from "@/lib/format";
import { Tag } from "@/components/ui/primitives";

interface Props {
  match: Match;
}

export function TrainingPanel({ match }: Props) {
  const state = match.training!;
  const target = trainingCurrentTarget(state);
  const total = trainingTotalRounds(state, match.config);
  const turnDarts = state.currentDarts;

  const currentTargetText = target ? targetLabel(target) : "—";
  const subtitle = (() => {
    if (state.drill === "doubles") {
      return target?.kind === "bull" ? "Final round · BULL" : `Target · D${state.cursor + 1}`;
    }
    if (state.drill === "bobs27") {
      return `Target · D${state.cursor + 1}`;
    }
    return `Checkout ${state.cursor + 1} of ${total}`;
  })();

  const liveScore = (() => {
    if (state.drill === "checkout" && target?.kind === "checkout") {
      return target.remaining - sumDarts(turnDarts);
    }
    if (state.drill === "bobs27") return state.score;
    return null;
  })();

  const hint =
    state.drill === "checkout" && target?.kind === "checkout" && liveScore !== null && liveScore > 0
      ? checkoutHint(liveScore, "double")
      : null;

  const hits = state.rounds.reduce((a, r) => a + r.hits, 0);
  const successCount = state.rounds.filter((r) => r.outcome === "checkout-success").length;

  return (
    <div className="relative p-3 md:p-6 border-b border-border-soft" style={{ background: "#1c2420", minHeight: 260 }}>
      <div className="absolute top-0 left-0 right-0 h-1 bg-electric" style={{ boxShadow: "0 0 20px #d4ff3a" }} />

      <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Tag color="#d4ff3a">
            <span className="w-1.5 h-1.5 rounded-full live-dot bg-electric" />
            {drillLabel(state.drill)}
          </Tag>
          <span
            className="f-mono text-[10px] uppercase text-muted"
            style={{ letterSpacing: "0.2em" }}
          >
            {subtitle}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ProgressBadge label="round" value={`${Math.min(state.cursor + 1, total)} / ${total}`} />
          {state.drill === "doubles" && <ProgressBadge label="hits" value={`${hits}`} />}
          {state.drill === "bobs27" && (
            <ProgressBadge label="score" value={`${state.score}`} accent={state.score < 27 ? "#e63946" : "#d4ff3a"} />
          )}
          {state.drill === "checkout" && (
            <ProgressBadge label="hit" value={`${successCount} / ${state.rounds.length || 0}`} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-end gap-4">
        <div>
          <div
            className="f-mono text-[10px] uppercase text-muted mb-1"
            style={{ letterSpacing: "0.25em" }}
          >
            {state.drill === "checkout" ? "checkout from" : "current target"}
          </div>
          <div
            className="f-display font-black leading-none text-electric"
            style={{
              fontSize: "clamp(80px, 17vw, 180px)",
              textShadow: "0 0 30px #d4ff3a55",
            }}
          >
            {currentTargetText}
          </div>
          {hint && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span
                className="f-mono text-[10px] uppercase text-electric"
                style={{ letterSpacing: "0.22em" }}
              >
                Suggest
              </span>
              <div className="flex gap-1.5">
                {hint.map((h, i) => (
                  <span
                    key={i}
                    className="f-display font-bold text-xs px-2 py-0.5 border"
                    style={{
                      borderColor: "#d4ff3a",
                      background: "#d4ff3a14",
                      color: "#d4ff3a",
                    }}
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}
          {state.drill === "checkout" && liveScore !== null && liveScore > 0 && turnDarts.length > 0 && (
            <div
              className="f-mono text-xs text-bone mt-2"
              style={{ letterSpacing: "0.1em" }}
            >
              {liveScore} remaining
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-1.5 w-full md:w-[360px]">
          {[0, 1, 2].map((i) => {
            const d = turnDarts[i];
            const filled = !!d;
            return (
              <div
                key={i}
                className={filled ? "dart-in" : ""}
                style={{
                  border: `1px solid ${
                    filled
                      ? d.multiplier === 3 ? "#e63946"
                      : d.multiplier === 2 ? "#d4ff3a"
                      : "#2a332d"
                      : "#1f2824"
                  }`,
                  background: filled
                    ? d.multiplier === 3 ? "#e6394618"
                    : d.multiplier === 2 ? "#d4ff3a18"
                    : "#0a0e0c"
                    : "#0a0e0c",
                  padding: "8px 10px",
                }}
              >
                <div
                  className="f-mono text-[9px] text-muted"
                  style={{ letterSpacing: "0.18em" }}
                >
                  D{i + 1}
                </div>
                <div className="flex items-baseline justify-between">
                  <span
                    className="f-display font-black text-lg"
                    style={{ color: filled ? "#f2e8d0" : "#454b47" }}
                  >
                    {filled ? d.label : "—"}
                  </span>
                  {filled && <span className="f-mono text-[10px] text-bone">{d.score}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {state.rounds.length > 0 && (
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
          <span
            className="f-mono text-[9px] uppercase text-muted shrink-0"
            style={{ letterSpacing: "0.25em" }}
          >
            recent
          </span>
          <div className="flex gap-1.5">
            {state.rounds.slice(-12).map((r, i) => {
              const ok =
                r.outcome === "hit" ||
                r.outcome === "checkout-success" ||
                r.outcome === "bobs-win";
              const bad =
                r.outcome === "checkout-fail" ||
                r.outcome === "bobs-bust";
              const tcolor = ok ? "#d4ff3a" : bad ? "#e63946" : "#3a4540";
              return (
                <span
                  key={i}
                  className="f-mono text-[10px] px-1.5 py-0.5 border whitespace-nowrap"
                  style={{
                    borderColor: tcolor,
                    color: ok ? "#d4ff3a" : bad ? "#e63946" : "#d8cdaf",
                    background: ok ? "#d4ff3a10" : bad ? "#e6394610" : "transparent",
                  }}
                >
                  {targetLabel(r.target)}
                  {r.outcome === "checkout-success" && " ✓"}
                  {r.outcome === "checkout-fail" && " ✗"}
                  {(r.outcome === "hit" || r.outcome === "miss") && ` · ${r.hits}/${r.darts.length}`}
                  {r.scoreAfter !== undefined && ` → ${r.scoreAfter}`}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressBadge({ label, value, accent = "#f2e8d0" }: { label: string; value: string; accent?: string }) {
  return (
    <div className="text-right">
      <div
        className="f-mono text-[9px] uppercase text-muted"
        style={{ letterSpacing: "0.22em" }}
      >
        {label}
      </div>
      <div
        className="f-display font-black text-xl leading-none"
        style={{ color: accent }}
      >
        {value}
      </div>
    </div>
  );
}

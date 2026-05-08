"use client";

import { Home, Target } from "lucide-react";
import type { Match, TrainingState } from "@/lib/types";
import { computeTrainingStats } from "@/lib/scoring";
import { drillLabel, targetLabel } from "@/lib/format";
import { BrandMark, Tag } from "@/components/ui/primitives";

interface Props {
  match: Match;
  onNewMatch: () => void;
  onRestart: () => void;
}

export function TrainingSummary({ match, onNewMatch, onRestart }: Props) {
  const state = match.training!;
  const stats = computeTrainingStats(state);
  const durationMin =
    match.endedAt && match.startedAt
      ? Math.round((match.endedAt - match.startedAt) / 60000)
      : 0;

  const headline = (() => {
    if (state.drill === "bobs27") {
      return state.finalKind === "bust" ? "BUSTED." : "DRILL DONE.";
    }
    if (state.drill === "doubles") return "DRILL DONE.";
    return "PRACTICE DONE.";
  })();

  const subline = (() => {
    if (state.drill === "doubles") return `${stats.hits} hits across 21 targets`;
    if (state.drill === "bobs27") {
      if (state.finalKind === "bust") return `Busted on D${state.cursor + 1} with ${stats.finalScore ?? 0} pts`;
      return `Final score · ${stats.finalScore ?? 0} pts`;
    }
    return `${stats.hits} of ${stats.attempts} checkouts`;
  })();

  return (
    <div className="min-h-screen flex flex-col bg-ink">
      <div className="flex items-center justify-between px-6 py-5 border-b border-border-soft">
        <BrandMark size="sm" />
        <Tag color="#6d736f">practice complete</Tag>
      </div>
      <div className="flex-1 px-6 py-10 md:py-16 max-w-5xl w-full mx-auto">
        <div className="flex items-center gap-3 mb-4 rise">
          <div className="h-px w-10 bg-electric" />
          <span
            className="f-mono text-xs uppercase text-electric"
            style={{ letterSpacing: "0.25em" }}
          >
            {drillLabel(state.drill)} {durationMin > 0 && `· ${durationMin}m`}
          </span>
        </div>

        <div className="bang mb-10">
          <div
            className="f-display font-black leading-[0.88]"
            style={{
              fontSize: "clamp(64px, 11vw, 180px)",
              color: state.finalKind === "bust" ? "#e63946" : "#f2e8d0",
            }}
          >
            {headline}
          </div>
          <div className="f-serif italic text-xl mt-4 text-bone">
            {subline}
          </div>
        </div>

        <div className="mb-10">
          <DrillStatsCard state={state} stats={stats} />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={onRestart}
            className="f-display font-black text-2xl uppercase px-6 py-4 flex items-center gap-3 bg-electric text-ink"
          >
            <Target className="w-6 h-6" strokeWidth={2.5} /> Practice again
          </button>
          <button
            onClick={onNewMatch}
            className="f-mono text-sm uppercase px-6 py-4 border border-border text-cream flex items-center gap-2"
            style={{ letterSpacing: "0.22em" }}
          >
            <Home className="w-4 h-4" /> Lobby
          </button>
        </div>
      </div>
    </div>
  );
}

function DrillStatsCard({ state, stats }: { state: TrainingState; stats: ReturnType<typeof computeTrainingStats> }) {
  return (
    <div className="border border-border p-6" style={{ background: "#141a17" }}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <MiniStat label="DARTS" value={stats.totalDarts} />
        {state.drill === "checkout" ? (
          <>
            <MiniStat label="HIT" value={`${stats.hits} / ${stats.attempts}`} highlight />
            <MiniStat label="ACCURACY" value={`${stats.accuracyPct.toFixed(0)}%`} />
            <MiniStat label="AVG DARTS" value={(stats.avgFinishDarts ?? 0).toFixed(1)} />
          </>
        ) : (
          <>
            <MiniStat label="HITS" value={stats.hits} highlight />
            <MiniStat label="ACCURACY" value={`${stats.accuracyPct.toFixed(0)}%`} />
            <MiniStat label="STREAK" value={stats.longestStreak} />
          </>
        )}
      </div>
      {state.drill === "bobs27" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <MiniStat label="FINAL SCORE" value={stats.finalScore ?? 0} highlight wide />
          <MiniStat label="OUTCOME" value={state.finalKind === "bust" ? "BUST" : "COMPLETE"} accent={state.finalKind === "bust"} />
        </div>
      )}
      {state.drill === "checkout" && stats.bestFinish ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <MiniStat label="BEST FINISH" value={stats.bestFinish} highlight wide />
        </div>
      ) : null}

      <div className="border-t border-border-soft pt-4">
        <div
          className="f-mono text-[10px] uppercase text-muted mb-3"
          style={{ letterSpacing: "0.22em" }}
        >
          rounds
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {state.rounds.map((r, i) => {
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
                className="f-mono text-[10px] px-2 py-1 border whitespace-nowrap"
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
    </div>
  );
}

function MiniStat({
  label, value, highlight, accent, muted, wide,
}: {
  label: string; value: string | number;
  highlight?: boolean; accent?: boolean; muted?: boolean; wide?: boolean;
}) {
  return (
    <div className="border p-2 bg-ink border-border-soft">
      <div
        className="f-mono text-[9px] uppercase text-muted"
        style={{ letterSpacing: "0.2em" }}
      >
        {label}
      </div>
      <div
        className={`f-display font-black ${wide ? "text-2xl" : "text-xl"} mt-0.5`}
        style={{
          color: highlight ? "#d4ff3a" : accent ? "#e63946" : muted ? "#454b47" : "#f2e8d0",
        }}
      >
        {value}
      </div>
    </div>
  );
}

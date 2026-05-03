"use client";

import { useEffect, useRef } from "react";
import type { Dart, Turn } from "@/lib/types";
import { initials } from "@/lib/format";
import { Tag } from "@/components/ui/primitives";

interface Props {
  name: string;
  live: number;
  showRemaining: boolean;
  active: boolean;
  legsWon: number;
  completedTurns: Turn[];
  currentTurnDarts: Dart[];
  side: "left" | "right";
  accent: string;
  avg: number;
  dartsThrown: number;
  notStartedYet: boolean;
}

function chipColors(d: Dart | null) {
  if (!d) return { border: "#1f2824", background: "#0a0e0c" };
  if (d.multiplier === 3) return { border: "#e63946", background: "#e6394618" };
  if (d.multiplier === 2) return { border: "#d4ff3a", background: "#d4ff3a18" };
  return { border: "#2a332d", background: "#0a0e0c" };
}

function DartChip({ dart, currentTurn }: { dart: Dart | null; currentTurn: boolean }) {
  const { border, background } = chipColors(dart);
  const ringColor = currentTurn && !dart ? "#d4ff3a55" : border;
  return (
    <div
      className={dart ? "dart-in" : ""}
      style={{
        border: `1px solid ${ringColor}`,
        background,
        padding: "4px 6px",
        minWidth: 44,
        flexShrink: 0,
      }}
    >
      <div className="flex items-baseline justify-between gap-1">
        <span
          className="f-display font-black text-sm leading-none"
          style={{ color: dart ? "#f2e8d0" : "#454b47" }}
        >
          {dart ? dart.label : "—"}
        </span>
        {dart && (
          <span className="f-mono text-[10px] text-bone leading-none">{dart.score}</span>
        )}
      </div>
    </div>
  );
}

export function PlayerPanel({
  name, live, showRemaining, active, legsWon,
  completedTurns, currentTurnDarts,
  side, accent, avg, dartsThrown, notStartedYet,
}: Props) {
  const stripRef = useRef<HTMLDivElement>(null);

  const chunks: { darts: (Dart | null)[]; isCurrent: boolean }[] = completedTurns.map(
    (t) => ({ darts: t.darts as (Dart | null)[], isCurrent: false }),
  );
  if (active) {
    chunks.push({
      darts: [0, 1, 2].map((i) => currentTurnDarts[i] ?? null),
      isCurrent: true,
    });
  }

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth;
  }, [completedTurns.length, currentTurnDarts.length, active]);

  return (
    <div
      className={`relative p-3 md:p-5 ${side === "left" ? "border-r border-border-soft" : ""}`}
      style={{
        background: active ? "#1c2420" : "#141a17",
        minHeight: 220,
      }}
    >
      {active && (
        <div
          className="absolute top-0 left-0 right-0 h-1 bg-electric"
          style={{ boxShadow: "0 0 20px #d4ff3a" }}
        />
      )}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-9 h-9 flex items-center justify-center f-display font-black"
            style={{
              background: active ? accent : "#2a332d",
              color: active ? "#0a0e0c" : "#f2e8d0",
            }}
          >
            {initials(name)}
          </div>
          <div className="min-w-0">
            <div
              className="f-display font-black text-base md:text-lg truncate text-cream"
              style={{ maxWidth: 150 }}
            >
              {name}
            </div>
            <div
              className="f-mono text-[9px] uppercase text-muted"
              style={{ letterSpacing: "0.2em" }}
            >
              legs · {legsWon}
            </div>
          </div>
        </div>
        {active && (
          <Tag color="#d4ff3a">
            <span className="w-1.5 h-1.5 rounded-full live-dot bg-electric" />
            on oche
          </Tag>
        )}
      </div>

      <div className="flex items-end justify-between gap-2">
        <div
          className="f-display font-black leading-none"
          style={{
            fontSize: "clamp(56px, 13vw, 130px)",
            color: notStartedYet ? "#d8cdaf" : (active ? "#d4ff3a" : "#f2e8d0"),
            textShadow: active && !notStartedYet ? "0 0 30px #d4ff3a55" : "none",
            opacity: notStartedYet ? 0.7 : 1,
          }}
        >
          {showRemaining ? String(live).padStart(3, "0") : (live === 0 ? "—" : String(live))}
        </div>
        <div className="text-right pb-1 shrink-0">
          <div
            className="f-mono text-[9px] uppercase text-muted mb-0.5"
            style={{ letterSpacing: "0.2em" }}
          >
            avg
          </div>
          <div
            className="f-display font-black leading-none"
            style={{
              fontSize: "clamp(22px, 4vw, 38px)",
              color: dartsThrown > 0 ? (active ? "#d4ff3a" : "#f2e8d0") : "#454b47",
            }}
          >
            {dartsThrown > 0 ? avg.toFixed(1) : "—"}
          </div>
        </div>
      </div>
      {notStartedYet && (
        <div
          className="f-mono text-[10px] uppercase -mt-1 mb-1 text-oche-red"
          style={{ letterSpacing: "0.22em" }}
        >
          Awaiting double in
        </div>
      )}

      <div
        ref={stripRef}
        className="mt-3 flex gap-2 overflow-x-auto"
        style={{ minHeight: 36, scrollbarWidth: "thin" }}
      >
        {chunks.length === 0 ? (
          <div
            className="flex items-center f-mono text-[10px] uppercase text-muted"
            style={{ letterSpacing: "0.18em" }}
          >
            no darts yet
          </div>
        ) : (
          chunks.map((chunk, ci) => (
            <div
              key={ci}
              className="flex items-stretch gap-1"
              style={{
                borderLeft: ci > 0 ? "1px solid #1f2824" : "none",
                paddingLeft: ci > 0 ? 8 : 0,
              }}
            >
              {chunk.darts.map((d, di) => (
                <DartChip key={di} dart={d} currentTurn={chunk.isCurrent} />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

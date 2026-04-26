"use client";

import type { Dart } from "@/lib/types";
import { initials } from "@/lib/format";
import { Tag } from "@/components/ui/primitives";

interface Props {
  name: string;
  live: number;
  showRemaining: boolean;
  active: boolean;
  legsWon: number;
  turnDarts: Dart[];
  side: "left" | "right";
  accent: string;
  avg: number;
  dartsThrown: number;
  notStartedYet: boolean;
}

export function PlayerPanel({
  name, live, showRemaining, active, legsWon, turnDarts, side, accent, avg, dartsThrown, notStartedYet,
}: Props) {
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

      <div className="mt-3 grid grid-cols-3 gap-1.5">
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
                padding: "6px 8px",
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
                  className="f-display font-black text-base"
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
  );
}

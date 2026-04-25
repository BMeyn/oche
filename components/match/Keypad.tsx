"use client";

import type { Multiplier } from "@/lib/types";

interface KeypadProps {
  multiplier: Multiplier;
  setMultiplier: (m: Multiplier) => void;
  onThrow: (num: number) => void;
  turnTotal: number;
}

export function Keypad({ multiplier, setMultiplier, onThrow, turnTotal }: KeypadProps) {
  return (
    <div className="flex-1 p-3 md:p-5 grid gap-3 bg-ink">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1.5">
          {([
            { m: 1 as const, label: "SINGLE", short: "S" },
            { m: 2 as const, label: "DOUBLE", short: "D" },
            { m: 3 as const, label: "TRIPLE", short: "T" },
          ]).map(({ m, label, short }) => {
            const active = multiplier === m;
            const activeBg = m === 3 ? "#e63946" : m === 2 ? "#d4ff3a" : "#1c2420";
            const activeFg = m === 3 ? "#f2e8d0" : m === 2 ? "#0a0e0c" : "#f2e8d0";
            return (
              <button
                key={m}
                onClick={() => setMultiplier(m)}
                className="key f-display font-black px-3 py-2.5 text-lg flex items-center gap-2"
                style={{
                  background: active ? activeBg : "#141a17",
                  color: active ? activeFg : "#d8cdaf",
                  border: `1px solid ${active ? activeBg : "#2a332d"}`,
                  minWidth: 82,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    padding: "1px 6px",
                    background: active ? "#00000022" : "transparent",
                    border: `1px solid ${active ? "transparent" : "#2a332d"}`,
                  }}
                >
                  {short}
                </span>
                <span
                  className="hidden sm:inline text-sm"
                  style={{ letterSpacing: "0.1em" }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex-1 min-w-[140px] flex items-center justify-end gap-3 f-mono text-xs text-muted">
          <span style={{ letterSpacing: "0.2em" }}>TURN</span>
          <span
            className="f-display font-black text-2xl"
            style={{ color: turnTotal >= 100 ? "#d4ff3a" : "#f2e8d0" }}
          >
            {turnTotal}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
          <NumKey key={n} onClick={() => onThrow(n)} multiplier={multiplier} number={n} />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <button
          onClick={() => onThrow(25)}
          className="key py-4 f-display font-black text-xl border bg-surface border-border text-cream"
        >
          25 <span className="f-mono text-[10px] ml-1 text-muted">outer</span>
        </button>
        <button
          onClick={() => onThrow(50)}
          className="key py-4 f-display font-black text-xl border bg-oche-red border-oche-red text-cream"
        >
          BULL <span className="f-mono text-[10px] ml-1 opacity-75">50</span>
        </button>
        <button
          onClick={() => onThrow(0)}
          className="key py-4 f-display font-black text-lg border bg-surface2 border-border text-bone"
          style={{ letterSpacing: "0.05em" }}
        >
          MISS
        </button>
      </div>
    </div>
  );
}

function NumKey({
  number, onClick, multiplier,
}: { number: number; onClick: () => void; multiplier: Multiplier }) {
  const label = multiplier === 3 ? `T${number}` : multiplier === 2 ? `D${number}` : `${number}`;
  const val = multiplier * number;
  const tinted = multiplier > 1;
  return (
    <button
      onClick={onClick}
      className="key py-3 border flex flex-col items-center justify-center text-cream"
      style={{
        background: tinted ? (multiplier === 3 ? "#e6394618" : "#d4ff3a18") : "#141a17",
        borderColor: tinted ? (multiplier === 3 ? "#e6394680" : "#d4ff3a80") : "#2a332d",
      }}
    >
      <span className="f-display font-black text-xl leading-none">{number}</span>
      {tinted && (
        <span
          className="f-mono text-[9px] mt-0.5"
          style={{
            color: multiplier === 3 ? "#e63946" : "#d4ff3a",
            letterSpacing: "0.1em",
          }}
        >
          {label}={val}
        </span>
      )}
    </button>
  );
}

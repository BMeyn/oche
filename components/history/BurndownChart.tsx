"use client";

import type { CompletedLeg } from "@/lib/types";

interface Props {
  leg: CompletedLeg;
  players: [string, string];
  startingScore: number;
}

const COLORS: [string, string] = ["#d4ff3a", "#e63946"];
const W = 720;
const H = 280;
const PAD_L = 44;
const PAD_R = 56;
const PAD_T = 16;
const PAD_B = 28;

export function BurndownChart({ leg, players, startingScore }: Props) {
  const turns0 = leg.turns[0];
  const turns1 = leg.turns[1];
  const maxTurns = Math.max(turns0.length, turns1.length);

  // Build per-player series: index 0 = startingScore, then remainingAfter per turn
  const series: [number[], number[]] = [
    [startingScore, ...turns0.map((t) => t.remainingAfter)],
    [startingScore, ...turns1.map((t) => t.remainingAfter)],
  ];

  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const xCount = Math.max(maxTurns, 1);

  const xAt = (i: number) => PAD_L + (i / xCount) * innerW;
  const yAt = (v: number) => PAD_T + (1 - v / startingScore) * innerH;

  // Y-axis ticks: 0, 100, 200, ..., startingScore
  const yTicks: number[] = [];
  for (let v = 0; v <= startingScore; v += 100) yTicks.push(v);
  if (yTicks[yTicks.length - 1] !== startingScore) yTicks.push(startingScore);

  // X-axis ticks: every turn (cap labels if too many)
  const xTickStep = maxTurns <= 12 ? 1 : Math.ceil(maxTurns / 10);

  const buildPath = (pts: number[]): string =>
    pts.map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(v)}`).join(" ");

  return (
    <div className="border border-border-soft p-4" style={{ background: "#0d1210" }}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <div
          className="f-mono text-[10px] uppercase text-muted"
          style={{ letterSpacing: "0.22em" }}
        >
          Score remaining · Leg {leg.number}
        </div>
        <div className="flex items-center gap-4">
          {([0, 1] as const).map((p) => (
            <div key={p} className="flex items-center gap-1.5">
              <span
                className="inline-block"
                style={{ width: 14, height: 2, background: COLORS[p] }}
              />
              <span className="f-mono text-[10px] uppercase text-cream" style={{ letterSpacing: "0.18em" }}>
                {players[p]}
              </span>
            </div>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Burndown chart">
        {/* Y-axis gridlines + labels */}
        {yTicks.map((v) => (
          <g key={`y-${v}`}>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={yAt(v)}
              y2={yAt(v)}
              stroke="#2a332d"
              strokeWidth={1}
              strokeDasharray={v === 0 || v === startingScore ? "" : "2 3"}
            />
            <text
              x={PAD_L - 8}
              y={yAt(v) + 3}
              fontSize="9"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fill="#6d736f"
              textAnchor="end"
            >
              {v}
            </text>
          </g>
        ))}

        {/* X-axis labels (turn numbers) */}
        {Array.from({ length: maxTurns + 1 }).map((_, i) => {
          if (i === 0 || (i % xTickStep !== 0 && i !== maxTurns)) return null;
          return (
            <text
              key={`x-${i}`}
              x={xAt(i)}
              y={H - PAD_B + 14}
              fontSize="9"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fill="#6d736f"
              textAnchor="middle"
            >
              {i}
            </text>
          );
        })}
        <text
          x={PAD_L + innerW / 2}
          y={H - 4}
          fontSize="8"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fill="#454b47"
          textAnchor="middle"
          letterSpacing="2"
        >
          TURN
        </text>

        {/* Lines + points + end labels */}
        {([0, 1] as const).map((p) => {
          const pts = series[p];
          if (pts.length < 2) return null;
          const lastIdx = pts.length - 1;
          return (
            <g key={`line-${p}`}>
              <path d={buildPath(pts)} fill="none" stroke={COLORS[p]} strokeWidth={2} strokeLinejoin="round" />
              {pts.map((v, i) => (
                <circle key={i} cx={xAt(i)} cy={yAt(v)} r={2.5} fill={COLORS[p]} />
              ))}
              <text
                x={xAt(lastIdx) + 6}
                y={yAt(pts[lastIdx]) + 3}
                fontSize="11"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                fill={COLORS[p]}
                fontWeight="700"
              >
                {pts[lastIdx]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

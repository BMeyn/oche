"use client";

import { useMemo } from "react";
import { Crown, Home, RotateCcw } from "lucide-react";
import type { Match, PlayerStats } from "@/lib/types";
import { computeStats } from "@/lib/scoring";
import { ruleLabel } from "@/lib/format";
import { BrandMark, Tag } from "@/components/ui/primitives";

interface Props {
  match: Match;
  onRestart: () => void;
  onNewMatch: () => void;
}

export function SummaryScreen({ match, onRestart, onNewMatch }: Props) {
  const stats = useMemo(() => computeStats(match), [match]);
  const winner = match.winner!;
  const loser = (1 - winner) as 0 | 1;
  const durationMin =
    match.endedAt && match.startedAt
      ? Math.round((match.endedAt - match.startedAt) / 60000)
      : 0;

  return (
    <div className="min-h-screen flex flex-col bg-ink">
      <div className="flex items-center justify-between px-6 py-5 border-b border-border-soft">
        <BrandMark size="sm" />
        <Tag color="#6d736f">match complete</Tag>
      </div>
      <div className="flex-1 px-6 py-10 md:py-16 max-w-5xl w-full mx-auto">
        <div className="flex items-center gap-3 mb-4 rise">
          <div className="h-px w-10 bg-electric" />
          <span
            className="f-mono text-xs uppercase text-electric"
            style={{ letterSpacing: "0.25em" }}
          >
            winner {durationMin > 0 && `· ${durationMin}m`}
            {match.config.mode === "x01" &&
              ` · ${match.config.startingScore} ${ruleLabel(match.config)}`}
            {match.config.mode === "highlow" && " · HIGH-LOW"}
          </span>
        </div>
        <div className="bang mb-10">
          <div
            className="f-display font-black leading-[0.88] text-cream"
            style={{ fontSize: "clamp(64px, 11vw, 180px)" }}
          >
            {match.config.players[winner].toUpperCase()}
          </div>
          <div
            className="f-display font-black leading-[0.9] mt-2 text-electric"
            style={{ fontSize: "clamp(48px, 8vw, 120px)" }}
          >
            TAKES IT{" "}
            <span className="text-cream">
              {match.legsWon[winner]}–{match.legsWon[loser]}.
            </span>
          </div>
          <div className="f-serif italic text-xl mt-4 text-bone">
            "game, set and match."
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-5 mb-10">
          {([winner, loser] as const).map((i) => (
            <StatsCard
              key={i}
              name={match.config.players[i]}
              isWinner={i === winner}
              stats={stats[i]}
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={onRestart}
            className="f-display font-black text-2xl uppercase px-6 py-4 flex items-center gap-3 bg-electric text-ink"
          >
            Rematch <RotateCcw className="w-6 h-6" strokeWidth={3} />
          </button>
          <button
            onClick={onNewMatch}
            className="f-mono text-sm uppercase px-6 py-4 border border-border text-cream flex items-center gap-2"
            style={{ letterSpacing: "0.22em" }}
          >
            <Home className="w-4 h-4" /> New match
          </button>
        </div>
      </div>
    </div>
  );
}

function StatsCard({
  name, isWinner, stats,
}: { name: string; isWinner: boolean; stats: PlayerStats }) {
  return (
    <div
      className="border p-6 relative"
      style={{
        background: isWinner ? "#1c2420" : "#141a17",
        borderColor: isWinner ? "#d4ff3a" : "#2a332d",
      }}
    >
      {isWinner && <Crown className="absolute top-4 right-4 w-5 h-5 text-electric" />}
      <div
        className="f-mono text-[10px] uppercase mb-1 text-muted"
        style={{ letterSpacing: "0.24em" }}
      >
        {isWinner ? "WINNER" : "RUNNER-UP"}
      </div>
      <div className="f-display font-black text-3xl mb-5 text-cream">{name}</div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <MiniStat
          label="3-DART AVG"
          value={stats.threeDartAvg.toFixed(2)}
          highlight={isWinner}
          wide
        />
        <MiniStat label="DARTS" value={stats.totalDarts} />
        <MiniStat label="LEGS" value={stats.legsWon} />
      </div>
      <div className="grid grid-cols-4 gap-2 mb-3">
        <MiniStat label="180s" value={stats.tonEighty} accent={stats.tonEighty > 0} />
        <MiniStat label="140+" value={stats.tonForty} />
        <MiniStat label="100+" value={stats.tons} />
        <MiniStat label="BEST OUT" value={stats.bestFinish || "—"} />
      </div>
      <div className="grid grid-cols-4 gap-2">
        <MiniStat label="TRIPLES" value={stats.triples} />
        <MiniStat label="DOUBLES" value={stats.doubles} />
        <MiniStat label="BULLS" value={stats.bullseyes + stats.bulls25} />
        <MiniStat label="MISSES" value={stats.misses} muted />
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

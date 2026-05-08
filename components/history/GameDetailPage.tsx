"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Crown } from "lucide-react";
import { BrandMark, Tag } from "@/components/ui/primitives";
import { computeStats } from "@/lib/scoring";
import { ruleLabel } from "@/lib/format";
import type { Game, PlayerStats } from "@/lib/types";
import { BurndownChart } from "./BurndownChart";

interface Props {
  game: Game;
  currentUserId: number;
}

export function GameDetailPage({ game, currentUserId }: Props) {
  const router = useRouter();
  const match = game.matchState!;
  const [legIdx, setLegIdx] = useState(0);

  const stats = useMemo(() => computeStats(match), [match]);

  const winner = match.winner!;
  const loser = (1 - winner) as 0 | 1;

  // Player perspective for W/L tag
  const myIdx: 0 | 1 = game.player1Id === currentUserId ? 0 : 1;
  const myResult = match.winner === myIdx ? "win" : "loss";

  const durationMin =
    match.endedAt && match.startedAt
      ? Math.round((match.endedAt - match.startedAt) / 60000)
      : 0;

  const isX01 = match.config.mode === "x01";
  const isHighLow = match.config.mode === "highlow";
  const legs = match.legHistory;
  const safeLegIdx = Math.min(legIdx, Math.max(legs.length - 1, 0));
  const selectedLeg = legs[safeLegIdx];

  return (
    <div className="min-h-screen flex flex-col bg-ink">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-soft">
        <BrandMark />
        <button
          onClick={() => router.push("/history")}
          className="flex items-center gap-1.5 f-mono text-xs uppercase text-muted hover:text-cream"
          style={{ letterSpacing: "0.18em" }}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> History
        </button>
      </div>

      <div className="flex-1 px-6 py-10 max-w-5xl w-full mx-auto">
        <div className="rise">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-10 bg-electric" />
            <span
              className="f-mono text-xs uppercase text-electric"
              style={{ letterSpacing: "0.25em" }}
            >
              game detail
              {durationMin > 0 && ` · ${durationMin}m`}
              {isX01 && ` · ${match.config.startingScore} ${ruleLabel(match.config)}`}
              {isHighLow && " · HIGH-LOW"}
            </span>
          </div>

          <div className="mb-3 flex items-end gap-4 flex-wrap">
            <h1
              className="f-display font-black leading-[0.9] text-cream"
              style={{ fontSize: "clamp(36px, 6vw, 64px)" }}
            >
              {match.config.players[0].toUpperCase()}{" "}
              <span className="text-muted">vs</span>{" "}
              {match.config.players[1].toUpperCase()}
            </h1>
          </div>

          <div className="flex items-center gap-3 mb-8 flex-wrap">
            <Tag color={myResult === "win" ? "#d4ff3a" : "#e63946"}>
              {myResult === "win" ? "you won" : "you lost"}
            </Tag>
            <span className="f-mono text-sm text-bone">
              {match.legsWon[winner]}–{match.legsWon[loser]} legs
            </span>
            <span className="f-serif italic text-bone text-sm">
              "the chalk is final."
            </span>
          </div>

          {/* Burndown — X01 only */}
          {isX01 && legs.length > 0 && (
            <section className="mb-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px w-6 bg-border" />
                <span
                  className="f-mono text-xs uppercase text-muted"
                  style={{ letterSpacing: "0.25em" }}
                >
                  Burndown
                </span>
              </div>

              {legs.length > 1 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {legs.map((leg, i) => (
                    <button
                      key={leg.number}
                      onClick={() => setLegIdx(i)}
                      className="f-mono text-[11px] uppercase px-3 py-1.5 border"
                      style={{
                        letterSpacing: "0.18em",
                        borderColor: i === safeLegIdx ? "#d4ff3a" : "#2a332d",
                        background: i === safeLegIdx ? "#1c2420" : "transparent",
                        color: i === safeLegIdx ? "#d4ff3a" : "#a8a8a8",
                      }}
                    >
                      Leg {leg.number}
                    </button>
                  ))}
                </div>
              )}

              {selectedLeg && (
                <BurndownChart
                  leg={selectedLeg}
                  players={match.config.players}
                  startingScore={match.config.startingScore}
                />
              )}
            </section>
          )}

          {/* High-Low: per-leg best 3-dart total table */}
          {isHighLow && legs.length > 0 && (
            <section className="mb-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px w-6 bg-border" />
                <span
                  className="f-mono text-xs uppercase text-muted"
                  style={{ letterSpacing: "0.25em" }}
                >
                  Best 3-dart per leg
                </span>
              </div>
              <div className="border border-border-soft" style={{ background: "#0d1210" }}>
                <div className="grid grid-cols-4 px-4 py-2 border-b border-border-soft f-mono text-[10px] uppercase text-muted" style={{ letterSpacing: "0.2em" }}>
                  <div>Leg</div>
                  <div>{match.config.players[0]}</div>
                  <div>{match.config.players[1]}</div>
                  <div>Winner</div>
                </div>
                {legs.map((leg) => {
                  const best0 = leg.turns[0].reduce((m, t) => Math.max(m, t.rawTotal), 0);
                  const best1 = leg.turns[1].reduce((m, t) => Math.max(m, t.rawTotal), 0);
                  return (
                    <div
                      key={leg.number}
                      className="grid grid-cols-4 px-4 py-2.5 border-b border-border-soft last:border-b-0 f-mono text-sm"
                    >
                      <div className="text-muted">#{leg.number}</div>
                      <div className={leg.winner === 0 ? "text-electric font-bold" : "text-bone"}>{best0}</div>
                      <div className={leg.winner === 1 ? "text-electric font-bold" : "text-bone"}>{best1}</div>
                      <div className="text-cream">{match.config.players[leg.winner]}</div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Stats comparison */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px w-6 bg-border" />
              <span
                className="f-mono text-xs uppercase text-muted"
                style={{ letterSpacing: "0.25em" }}
              >
                Comparison
              </span>
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              {([0, 1] as const).map((i) => (
                <StatsCard
                  key={i}
                  name={match.config.players[i]}
                  isWinner={i === winner}
                  stats={stats[i]}
                />
              ))}
            </div>
          </section>
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

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronRight, Crown, RotateCcw } from "lucide-react";
import { BrandMark, Tag } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/Avatar";
import { TrainingSummary } from "@/components/summary/TrainingSummary";
import { computeStats } from "@/lib/scoring";
import { gameLabel } from "@/lib/format";
import type { CompletedLeg, Dart, Game, PlayerStats, Turn } from "@/lib/types";
import { BurndownChart } from "./BurndownChart";

interface Props {
  game: Game;
  currentUserId: number;
}

const PLAYER_COLORS: [string, string] = ["#d4ff3a", "#e63946"];

function formatDate(d: Date | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function GameDetailPage({ game, currentUserId }: Props) {
  const router = useRouter();
  const match = game.matchState!;
  const [legIdx, setLegIdx] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [rematchPending, setRematchPending] = useState(false);

  const stats = useMemo(() => computeStats(match), [match]);

  const isTraining = match.config.mode === "training";

  // Training: bail to the existing single-player summary screen
  if (isTraining) {
    return (
      <TrainingSummary
        match={match}
        onNewMatch={() => router.push("/history")}
        onRestart={() => router.push("/history")}
      />
    );
  }

  const winner = match.winner!;
  const loser = (1 - winner) as 0 | 1;

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
  const selectedLeg: CompletedLeg | undefined = legs[safeLegIdx];
  const finishedDate = formatDate(game.finishedAt);

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleRematch = async () => {
    if (rematchPending) return;
    setRematchPending(true);
    const res = await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rematchOf: game.id }),
    });
    if (!res.ok) {
      setRematchPending(false);
      return;
    }
    const newGame: Game = await res.json();
    router.push(`/match/${newGame.id}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-ink">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-soft">
        <BrandMark />
        <div className="flex items-center gap-3">
          <button
            onClick={handleRematch}
            disabled={rematchPending}
            className="flex items-center gap-1.5 f-mono text-xs uppercase border border-electric text-electric px-3 py-1.5 hover:bg-[#d4ff3a14] disabled:opacity-50"
            style={{ letterSpacing: "0.18em" }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {rematchPending ? "..." : "Rematch"}
          </button>
          <button
            onClick={() => router.push("/history")}
            className="flex items-center gap-1.5 f-mono text-xs uppercase text-muted hover:text-cream"
            style={{ letterSpacing: "0.18em" }}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> History
          </button>
        </div>
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
            </span>
          </div>

          {/* Player headline with avatars */}
          <div className="mb-3 flex items-center gap-5 flex-wrap">
            {([0, 1] as const).map((p) => (
              <div key={p} className="flex items-center gap-3">
                <Avatar
                  name={match.config.players[p]}
                  color={PLAYER_COLORS[p]}
                  size="lg"
                />
                <h1
                  className="f-display font-black leading-[0.9] text-cream"
                  style={{
                    fontSize: "clamp(28px, 5vw, 52px)",
                    color: p === winner ? "#f2e8d0" : "#a8a8a8",
                  }}
                >
                  {match.config.players[p].toUpperCase()}
                </h1>
                {p === 0 && (
                  <span className="f-display font-black text-3xl text-muted">
                    vs
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 mb-8 flex-wrap">
            <Tag color={myResult === "win" ? "#d4ff3a" : "#e63946"}>
              {myResult === "win" ? "you won" : "you lost"}
            </Tag>
            <span className="f-mono text-sm text-bone">
              {match.legsWon[winner]}–{match.legsWon[loser]} legs
            </span>
            <span className="f-mono text-xs text-muted" style={{ letterSpacing: "0.12em" }}>
              {gameLabel(match.config).toUpperCase()}
              {finishedDate && ` · ${finishedDate.toUpperCase()}`}
              {durationMin > 0 && ` · ${durationMin}M`}
            </span>
          </div>

          {/* Burndown — X01 only */}
          {isX01 && legs.length > 0 && (
            <section className="mb-10">
              <SectionLabel>Burndown</SectionLabel>

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
              <SectionLabel>Best 3-dart per leg</SectionLabel>
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

          {/* Leg-by-leg scoreboard — driven by the selected leg */}
          {selectedLeg && (
            <section className="mb-10">
              <SectionLabel>
                Leg {selectedLeg.number} · {match.config.players[selectedLeg.winner]} took it
              </SectionLabel>
              <LegScoreboard
                leg={selectedLeg}
                players={match.config.players}
                isX01={isX01}
                expanded={expanded}
                onToggle={toggleExpand}
              />
            </section>
          )}

          {/* Stats comparison */}
          <section className="mb-10">
            <SectionLabel>Comparison</SectionLabel>
            <div className="grid md:grid-cols-2 gap-5">
              {([0, 1] as const).map((i) => (
                <StatsCard
                  key={i}
                  name={match.config.players[i]}
                  isWinner={i === winner}
                  stats={stats[i]}
                  isX01={isX01}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="h-px w-6 bg-border" />
      <span
        className="f-mono text-xs uppercase text-muted"
        style={{ letterSpacing: "0.25em" }}
      >
        {children}
      </span>
    </div>
  );
}

function LegScoreboard({
  leg, players, isX01, expanded, onToggle,
}: {
  leg: CompletedLeg;
  players: [string, string];
  isX01: boolean;
  expanded: Set<string>;
  onToggle: (key: string) => void;
}) {
  const maxRows = Math.max(leg.turns[0].length, leg.turns[1].length);
  const rows = Array.from({ length: maxRows }, (_, i) => i);

  return (
    <div className="border border-border-soft" style={{ background: "#0d1210" }}>
      {/* Column headers */}
      <div className="grid grid-cols-2 border-b border-border-soft">
        {([0, 1] as const).map((p) => (
          <div
            key={p}
            className="flex items-center gap-2 px-4 py-2 border-r border-border-soft last:border-r-0"
          >
            <Avatar name={players[p]} color={PLAYER_COLORS[p]} size="sm" />
            <span className="f-display font-black text-sm text-cream">
              {players[p].toUpperCase()}
            </span>
          </div>
        ))}
      </div>

      {/* Per-turn rows */}
      {rows.map((rowIdx) => (
        <div
          key={rowIdx}
          className="grid grid-cols-2 border-b border-border-soft last:border-b-0"
        >
          {([0, 1] as const).map((p) => {
            const turn = leg.turns[p][rowIdx];
            const key = `${leg.number}:${p}:${rowIdx}`;
            const isExpanded = expanded.has(key);
            return (
              <div
                key={p}
                className="border-r border-border-soft last:border-r-0"
              >
                {turn ? (
                  <button
                    onClick={() => onToggle(key)}
                    className="w-full flex items-center justify-between px-4 py-2 f-mono text-sm hover:bg-[#141a17]"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded
                        ? <ChevronDown className="w-3.5 h-3.5 text-muted" />
                        : <ChevronRight className="w-3.5 h-3.5 text-muted" />}
                      <span className="text-muted text-xs">T{rowIdx + 1}</span>
                      <span
                        className="text-bone min-w-[2.5rem] text-left"
                        style={{
                          color: turn.kind === "bust" ? "#e63946"
                            : turn.kind === "win" ? "#d4ff3a"
                            : "#d8cdaf",
                        }}
                      >
                        {turn.kind === "bust" ? "—" : turn.total}
                      </span>
                      {turn.kind === "bust" && (
                        <span className="text-[10px] uppercase text-oche-red" style={{ letterSpacing: "0.18em" }}>bust</span>
                      )}
                      {turn.kind === "win" && (
                        <span className="text-[10px] uppercase text-electric" style={{ letterSpacing: "0.18em" }}>game shot</span>
                      )}
                    </div>
                    {isX01 && (
                      <span className="text-cream f-mono text-sm">
                        {turn.remainingAfter}
                      </span>
                    )}
                  </button>
                ) : (
                  <div className="px-4 py-2 f-mono text-sm text-muted-soft">—</div>
                )}
                {turn && isExpanded && <DartBreakdown turn={turn} />}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function DartBreakdown({ turn }: { turn: Turn }) {
  const slots: (Dart | null)[] = [0, 1, 2].map((i) => turn.darts[i] ?? null);
  return (
    <div className="px-4 pb-3 pt-1 grid grid-cols-3 gap-1.5" style={{ background: "#0a0e0c" }}>
      {slots.map((d, i) => (
        <div
          key={i}
          style={{
            border: `1px solid ${
              d
                ? d.multiplier === 3 ? "#e63946"
                : d.multiplier === 2 ? "#d4ff3a"
                : "#2a332d"
                : "#1f2824"
            }`,
            background: d
              ? d.multiplier === 3 ? "#e6394618"
              : d.multiplier === 2 ? "#d4ff3a18"
              : "#0a0e0c"
              : "#0a0e0c",
            padding: "4px 6px",
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
              className="f-display font-black text-sm"
              style={{ color: d ? "#f2e8d0" : "#454b47" }}
            >
              {d ? d.label : "—"}
            </span>
            {d && <span className="f-mono text-[10px] text-bone">{d.score}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatsCard({
  name, isWinner, stats, isX01,
}: { name: string; isWinner: boolean; stats: PlayerStats; isX01: boolean }) {
  const checkoutPct = isX01 && stats.checkoutAttempts > 0
    ? `${Math.round((stats.legsWon / stats.checkoutAttempts) * 100)}%`
    : "—";

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
        <MiniStat label="HIGH TURN" value={stats.highestTurn || "—"} />
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <MiniStat label="BEST OUT" value={stats.bestFinish || "—"} />
        <MiniStat label="CHECKOUT %" value={checkoutPct} highlight={isX01 && stats.checkoutAttempts > 0 && stats.legsWon === stats.checkoutAttempts} />
        <MiniStat label="ATTEMPTS" value={isX01 ? stats.checkoutAttempts : "—"} />
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

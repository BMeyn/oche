"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import type { Dart, Game, Match, Turn } from "@/lib/types";
import { initials, ruleLabel } from "@/lib/format";

interface Props {
  game: Game;
  tournamentId?: string;
}

interface LegSection {
  number: number;
  turns: Turn[];
  inProgress: Dart[] | null;
}

function buildTimeline(match: Match, p: 0 | 1): LegSection[] {
  const sections: LegSection[] = [];
  const cl = match.currentLeg;
  const isMidTurn = cl.currentPlayer === p && cl.currentTurnDarts.length > 0;
  if (cl.turns[p].length > 0 || isMidTurn) {
    sections.push({
      number: cl.number,
      turns: cl.turns[p],
      inProgress: isMidTurn ? cl.currentTurnDarts : null,
    });
  }
  for (let i = match.legHistory.length - 1; i >= 0; i--) {
    const l = match.legHistory[i];
    if (l.turns[p].length > 0) {
      sections.push({ number: l.number, turns: l.turns[p], inProgress: null });
    }
  }
  return sections;
}

function DartChip({ d }: { d: Dart }) {
  const border =
    d.multiplier === 3 ? "#e63946" : d.multiplier === 2 ? "#d4ff3a" : "#2a332d";
  const bg =
    d.multiplier === 3 ? "#e6394618" : d.multiplier === 2 ? "#d4ff3a18" : "#0a0e0c";
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{
        border: `1px solid ${border}`,
        background: bg,
        padding: "6px 8px",
        minWidth: 52,
      }}
    >
      <span className="f-display font-black text-base leading-none text-cream">{d.label}</span>
      <span className="f-mono text-[10px] text-bone mt-1 leading-none">{d.score}</span>
    </div>
  );
}

function PlaceholderChip() {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{
        border: "1px dashed #1f2824",
        background: "#0a0e0c",
        padding: "6px 8px",
        minWidth: 52,
      }}
    >
      <span className="f-display font-black text-base leading-none" style={{ color: "#454b47" }}>—</span>
      <span className="f-mono text-[10px] mt-1 leading-none" style={{ color: "#454b47" }}>·</span>
    </div>
  );
}

function TurnEntry({
  darts,
  total,
  kind,
  index,
}: {
  darts: Dart[];
  total: number;
  kind: "ok" | "bust" | "win" | "in-progress";
  index: number;
}) {
  return (
    <div
      className="flex items-center gap-2 md:gap-3 py-2.5"
      style={{ borderBottom: "1px solid #1f2824" }}
    >
      <span
        className="f-mono text-[10px] text-muted shrink-0 w-6 text-right"
        style={{ letterSpacing: "0.15em" }}
      >
        {index}
      </span>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => {
          const d = darts[i];
          return d ? <DartChip key={i} d={d} /> : <PlaceholderChip key={i} />;
        })}
      </div>
      <div className="ml-auto flex items-center gap-2 shrink-0">
        {kind === "bust" && (
          <span
            className="f-mono text-[9px] uppercase px-1.5 py-0.5 text-cream"
            style={{ letterSpacing: "0.2em", background: "#e63946" }}
          >
            BUST
          </span>
        )}
        {kind === "win" && (
          <span
            className="f-mono text-[9px] uppercase px-1.5 py-0.5"
            style={{ letterSpacing: "0.2em", background: "#d4ff3a", color: "#0a0e0c" }}
          >
            SHOT
          </span>
        )}
        {kind === "in-progress" && (
          <span
            className="f-mono text-[9px] uppercase text-electric"
            style={{ letterSpacing: "0.2em" }}
          >
            LIVE
          </span>
        )}
        <span className="f-display font-black text-lg md:text-xl text-cream tabular-nums">
          {total}
        </span>
      </div>
    </div>
  );
}

function PlayerColumn({
  name,
  accent,
  match,
  player,
  side,
}: {
  name: string;
  accent: string;
  match: Match;
  player: 0 | 1;
  side: "left" | "right";
}) {
  const sections = buildTimeline(match, player);
  const totalTurns = sections.reduce(
    (s, sec) => s + sec.turns.length + (sec.inProgress ? 1 : 0),
    0,
  );

  return (
    <div
      className={`p-4 md:p-6 ${side === "left" ? "border-r border-border-soft" : ""}`}
    >
      <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: `2px solid ${accent}` }}>
        <div
          className="w-9 h-9 flex items-center justify-center f-display font-black"
          style={{ background: accent, color: "#0a0e0c" }}
        >
          {initials(name)}
        </div>
        <div className="min-w-0">
          <div className="f-display font-black text-base md:text-lg text-cream truncate">
            {name}
          </div>
          <div
            className="f-mono text-[9px] uppercase text-muted"
            style={{ letterSpacing: "0.2em" }}
          >
            turns · {totalTurns}
          </div>
        </div>
      </div>

      {sections.length === 0 ? (
        <div
          className="f-mono text-xs text-muted py-6 text-center"
          style={{ letterSpacing: "0.18em" }}
        >
          no darts yet
        </div>
      ) : (
        sections.map((sec) => {
          const turnsReversed = [...sec.turns].reverse();
          const totalInLeg = sec.turns.length + (sec.inProgress ? 1 : 0);
          return (
            <div key={sec.number} className="mb-5">
              <div
                className="f-mono text-[10px] uppercase text-muted mb-2"
                style={{ letterSpacing: "0.24em" }}
              >
                Leg {sec.number}
              </div>
              <div>
                {sec.inProgress && (
                  <TurnEntry
                    index={totalInLeg}
                    darts={sec.inProgress}
                    total={sec.inProgress.reduce((s, d) => s + d.score, 0)}
                    kind="in-progress"
                  />
                )}
                {turnsReversed.map((t, idx) => (
                  <TurnEntry
                    key={idx}
                    index={sec.turns.length - idx}
                    darts={t.darts}
                    total={t.rawTotal}
                    kind={t.kind}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export function HistoryClient({ game: initialGame, tournamentId }: Props) {
  const router = useRouter();
  const [game, setGame] = useState<Game>(initialGame);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    const res = await fetch(`/api/games/${initialGame.id}`);
    if (!res.ok) return;
    const g: Game = await res.json();
    setGame(g);
  }, [initialGame.id]);

  useEffect(() => {
    if (game.status === "finished") {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(poll, 1500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [game.status, poll]);

  const backHref = `/match/${initialGame.id}${tournamentId ? `?tournament=${tournamentId}` : ""}`;
  const match = game.matchState;
  const p1Name = match?.config.players[0] ?? initialGame.player1Email.split("@")[0];
  const p2Name =
    match?.config.players[1] ?? (initialGame.player2Email?.split("@")[0] ?? "Opponent");

  return (
    <div className="min-h-screen flex flex-col bg-ink">
      <div className="flex items-center justify-between px-3 md:px-6 py-3 border-b border-border-soft">
        <button
          onClick={() => router.push(backHref)}
          className="flex items-center gap-1.5 f-mono text-xs uppercase text-bone"
          style={{ letterSpacing: "0.2em" }}
        >
          <ChevronLeft className="w-4 h-4" /> Back to match
        </button>
        <div className="flex items-center gap-3 md:gap-5">
          {match && (
            <div className="hidden sm:block f-mono text-[10px] uppercase text-muted" style={{ letterSpacing: "0.2em" }}>
              {match.config.mode === "x01"
                ? `${match.config.startingScore} · ${ruleLabel(match.config)}`
                : "HIGH-LOW"}
            </div>
          )}
          <div className="f-display font-black text-xl">
            <span style={{ color: (match?.legsWon[0] ?? 0) > (match?.legsWon[1] ?? 0) ? "#d4ff3a" : "#f2e8d0" }}>
              {match?.legsWon[0] ?? 0}
            </span>
            <span className="text-muted"> – </span>
            <span style={{ color: (match?.legsWon[1] ?? 0) > (match?.legsWon[0] ?? 0) ? "#d4ff3a" : "#f2e8d0" }}>
              {match?.legsWon[1] ?? 0}
            </span>
          </div>
          {game.status === "active" && (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full live-dot bg-electric" />
              <span
                className="f-mono text-[10px] uppercase text-electric"
                style={{ letterSpacing: "0.2em" }}
              >
                live
              </span>
            </div>
          )}
        </div>
        <div className="w-[88px] md:w-[140px]" aria-hidden />
      </div>

      {match ? (
        <div className="grid grid-cols-2 flex-1">
          <PlayerColumn name={p1Name} accent="#d4ff3a" match={match} player={0} side="left" />
          <PlayerColumn name={p2Name} accent="#e63946" match={match} player={1} side="right" />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div
            className="f-mono text-xs text-muted"
            style={{ letterSpacing: "0.2em" }}
          >
            match has not started
          </div>
        </div>
      )}
    </div>
  );
}

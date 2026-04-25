"use client";

import { useState, useMemo, useEffect } from "react";
import { ChevronLeft, Undo2 } from "lucide-react";
import type { Match, Multiplier } from "@/lib/types";
import {
  applyDart, displayRemaining, makeDart, undoLastDart, computeStats, sumDarts,
  isDouble, DART_MISS,
} from "@/lib/scoring";
import { checkoutHint } from "@/lib/checkouts";
import { ruleLabel } from "@/lib/format";
import { Tag } from "@/components/ui/primitives";
import { PlayerPanel } from "./PlayerPanel";
import { Keypad } from "./Keypad";

interface Props {
  match: Match;
  setMatch: (m: Match) => void;
  onExit: () => void;
  onFinish: (finalMatch: Match) => void;
}

interface LegOverlay {
  winner: 0 | 1;
  total: number | null;
  legNumber: number;
  mode: string;
  highlowBest: [number | null, number | null];
}

export function MatchScreen({ match, setMatch, onExit, onFinish }: Props) {
  const [multiplier, setMultiplier] = useState<Multiplier>(1);
  const [toast, setToast] = useState<{ msg: string; kind: "bust" | "info" } | null>(null);
  const [legOverlay, setLegOverlay] = useState<LegOverlay | null>(null);

  const isX01 = match.config.mode === "x01";
  const p = match.currentLeg.currentPlayer;
  const liveRemaining = displayRemaining(match, p);
  const turnDarts = match.currentLeg.currentTurnDarts;
  const hint = isX01 ? checkoutHint(liveRemaining, match.config.outRule ?? "double") : null;
  const stats = useMemo(() => computeStats(match), [match]);

  const needsDoubleIn =
    isX01 &&
    match.config.inRule === "double" &&
    !match.currentLeg.hasStarted[p] &&
    !turnDarts.some(isDouble);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1200);
    return () => clearTimeout(t);
  }, [toast]);

  const throwDart = (num: number) => {
    let dart;
    if (num === 0) dart = DART_MISS;
    else if (num === 25) dart = makeDart(1, 25);
    else if (num === 50) dart = makeDart(2, 25);
    else dart = makeDart(multiplier, num);

    const { match: next, outcome } = applyDart(match, dart);
    setMultiplier(1);

    if (outcome === "bust") setToast({ msg: "BUST", kind: "bust" });
    if (outcome === "leg-won") {
      const last = next.legHistory[next.legHistory.length - 1];
      setLegOverlay({
        winner: last.winner,
        total: isX01 ? sumDarts([...turnDarts, dart]) : null,
        legNumber: match.currentLeg.number,
        mode: match.config.mode,
        highlowBest: match.currentLeg.highlowBest,
      });
      setTimeout(() => setLegOverlay(null), 2200);
    }
    if (outcome === "match-won") {
      setMatch(next);
      setTimeout(() => onFinish(next), 1000);
      return;
    }
    setMatch(next);
  };

  const undo = () => {
    const next = undoLastDart(match);
    if (next !== match) {
      setMatch(next);
      setMultiplier(1);
    }
  };

  const turnTotal = sumDarts(turnDarts);
  const nothingToUndo =
    turnDarts.length === 0 &&
    match.currentLeg.turns[0].length === 0 &&
    match.currentLeg.turns[1].length === 0;

  return (
    <div className="min-h-screen flex flex-col bg-ink">
      <div className="flex items-center justify-between px-3 md:px-6 py-3 border-b border-border-soft">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 f-mono text-xs uppercase text-bone"
          style={{ letterSpacing: "0.2em" }}
        >
          <ChevronLeft className="w-4 h-4" /> Exit
        </button>
        <div className="flex items-center gap-3 md:gap-5">
          <div className="hidden sm:block">
            <Tag color="#6d736f">
              {match.config.mode === "x01"
                ? `${match.config.startingScore} · ${ruleLabel(match.config)}`
                : "HIGH-LOW"}
            </Tag>
          </div>
          <div
            className="f-mono text-xs text-muted"
            style={{ letterSpacing: "0.18em" }}
          >
            LEG{" "}
            <span className="f-display font-black text-base ml-1 text-cream">
              {match.currentLeg.number}
            </span>
          </div>
          <div className="f-display font-black text-xl">
            <span
              style={{
                color: match.legsWon[0] > match.legsWon[1] ? "#d4ff3a" : "#f2e8d0",
              }}
            >
              {match.legsWon[0]}
            </span>
            <span className="text-muted"> – </span>
            <span
              style={{
                color: match.legsWon[1] > match.legsWon[0] ? "#d4ff3a" : "#f2e8d0",
              }}
            >
              {match.legsWon[1]}
            </span>
          </div>
          <div className="hidden md:block">
            <Tag color="#6d736f">first to {match.config.legsToWin}</Tag>
          </div>
        </div>
        <button
          onClick={undo}
          disabled={nothingToUndo}
          className="flex items-center gap-1.5 f-mono text-xs uppercase px-3 py-1.5 border border-border"
          style={{
            color: nothingToUndo ? "#454b47" : "#d8cdaf",
            letterSpacing: "0.2em",
            opacity: nothingToUndo ? 0.4 : 1,
          }}
        >
          <Undo2 className="w-3 h-3" /> Undo
        </button>
      </div>

      <div className="grid grid-cols-2">
        <PlayerPanel
          name={match.config.players[0]}
          live={isX01 ? displayRemaining(match, 0) : (match.currentLeg.highlowBest[0] ?? 0)}
          showRemaining={isX01}
          active={p === 0}
          legsWon={match.legsWon[0]}
          turnDarts={p === 0 ? turnDarts : []}
          side="left"
          accent="#d4ff3a"
          avg={stats[0].threeDartAvg}
          dartsThrown={stats[0].totalDarts}
          notStartedYet={
            isX01 && match.config.inRule === "double" && !match.currentLeg.hasStarted[0]
          }
        />
        <PlayerPanel
          name={match.config.players[1]}
          live={isX01 ? displayRemaining(match, 1) : (match.currentLeg.highlowBest[1] ?? 0)}
          showRemaining={isX01}
          active={p === 1}
          legsWon={match.legsWon[1]}
          turnDarts={p === 1 ? turnDarts : []}
          side="right"
          accent="#e63946"
          avg={stats[1].threeDartAvg}
          dartsThrown={stats[1].totalDarts}
          notStartedYet={
            isX01 && match.config.inRule === "double" && !match.currentLeg.hasStarted[1]
          }
        />
      </div>

      <div className="px-3 md:px-6 py-2.5 border-t border-border-soft bg-surface flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 flex-wrap">
          {isX01 ? (
            needsDoubleIn ? (
              <>
                <Tag color="#e63946" bg="#e6394615">
                  NEEDS DOUBLE IN
                </Tag>
                <span className="f-mono text-xs text-bone">
                  Hit any double to start scoring
                </span>
              </>
            ) : hint ? (
              <>
                <span
                  className="f-mono text-[10px] uppercase text-muted"
                  style={{ letterSpacing: "0.24em" }}
                >
                  Checkout
                </span>
                <span className="f-display font-black text-xl text-electric">
                  {liveRemaining} → 0
                </span>
                <div className="flex gap-1">
                  {hint.map((h, i) => (
                    <span
                      key={i}
                      className="f-display font-bold text-xs px-1.5 py-0.5 bg-ink text-cream border border-border"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <span className="f-mono text-xs text-muted">
                {liveRemaining <= 0 ? "—" : `${liveRemaining} remaining`}
              </span>
            )
          ) : (
            <span className="f-mono text-xs text-bone">
              High-Low · best total wins the leg
            </span>
          )}
        </div>
        <div className="f-serif italic text-sm text-bone">
          {match.config.players[p]} to throw
          <span className="f-mono not-italic text-xs ml-2 text-muted">
            · dart {turnDarts.length + 1}/3
          </span>
        </div>
      </div>

      <Keypad
        multiplier={multiplier}
        setMultiplier={setMultiplier}
        onThrow={throwDart}
        turnTotal={turnTotal}
      />

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bang pointer-events-none">
          <div
            className="px-6 py-3 f-display font-black text-2xl border text-cream"
            style={{
              background: toast.kind === "bust" ? "#e63946" : "#0a0e0c",
              borderColor: toast.kind === "bust" ? "#e63946" : "#2a332d",
              letterSpacing: "0.05em",
            }}
          >
            {toast.msg}
          </div>
        </div>
      )}

      {legOverlay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "#0a0e0ce0" }}
        >
          <div className="bang text-center px-4">
            <div
              className="f-mono text-xs uppercase mb-3 text-electric"
              style={{ letterSpacing: "0.3em" }}
            >
              Leg {legOverlay.legNumber}
              {legOverlay.mode === "x01" && legOverlay.total &&
                ` · ${legOverlay.total} checkout`}
              {legOverlay.mode === "highlow" &&
                ` · ${legOverlay.highlowBest[legOverlay.winner]} top`}
            </div>
            <div
              className="f-display font-black leading-[0.9] text-cream"
              style={{ fontSize: "clamp(80px, 16vw, 220px)" }}
            >
              {legOverlay.mode === "x01" ? (
                <>
                  GAME <span className="text-electric">SHOT.</span>
                </>
              ) : (
                <>
                  LEG <span className="text-electric">WON.</span>
                </>
              )}
            </div>
            <div className="f-serif italic text-xl mt-3 text-bone">
              {match.config.players[legOverlay.winner]} takes it
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

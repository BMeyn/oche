"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type { GameHistoryItem } from "@/lib/db/history";

export function timeAgo(date: Date | string): string {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

interface Props {
  game: GameHistoryItem;
  /** Where the row navigates to on click. Pass `null` to render non-interactive (e.g. when the viewer wasn't a participant). */
  href: string | null;
}

export function GameRow({ game: g, href }: Props) {
  const router = useRouter();
  const interactive = href !== null;

  const handleNavigate = () => {
    if (href) router.push(href);
  };

  const opponentLink = g.opponentUserId !== null && g.opponentUserId !== undefined ? (
    <Link
      href={`/player/${g.opponentUserId}`}
      onClick={(e) => e.stopPropagation()}
      className="f-display font-black text-base hover:text-electric transition-colors"
      style={{ color: g.isGuestGame ? "#6d736f" : "#f2e8d0" }}
    >
      vs {g.opponent}
    </Link>
  ) : (
    <span className="f-display font-black text-base" style={{ color: g.isGuestGame ? "#6d736f" : "#f2e8d0" }}>
      vs {g.opponent}
    </span>
  );

  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? handleNavigate : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleNavigate();
              }
            }
          : undefined
      }
      className={`border border-border-soft flex items-center justify-between px-4 py-3 gap-3 ${
        interactive ? "cursor-pointer hover:border-border transition-colors" : ""
      }`}
      style={{
        background: g.isGuestGame ? "#0c0f0e" : g.result === "win" ? "#0f1a12" : "#0e1010",
        opacity: g.isGuestGame ? 0.5 : 1,
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="f-display font-black text-base"
            style={{ color: g.isGuestGame ? "#6d736f" : g.result === "win" ? "#d4ff3a" : "#e63946" }}
          >
            {g.result === "win" ? "W" : "L"}
          </span>
          {opponentLink}
          <span className="f-mono text-xs text-muted">
            {g.legsWon}–{g.legsLost}
          </span>
          {g.isGuestGame && (
            <span className="f-mono text-[9px] uppercase text-muted border border-border-soft px-1.5 py-0.5" style={{ letterSpacing: "0.15em" }}>
              guest · unranked
            </span>
          )}
        </div>
        <div className="f-mono text-[11px] text-muted mt-0.5 flex items-center gap-3 flex-wrap">
          <span>
            avg <span className="text-bone">{g.threeDartAvg.toFixed(2)}</span>
          </span>
          {g.tonEighty > 0 && (
            <span className="text-oche-red font-bold">{g.tonEighty} × 180</span>
          )}
          {g.bestFinish > 0 && (
            <span>
              best out <span className="text-bone">{g.bestFinish}</span>
            </span>
          )}
          <span className="ml-auto">{timeAgo(g.date)}</span>
        </div>
      </div>
      <div className="shrink-0 text-right flex items-center gap-2">
        <div className="f-mono text-[10px] text-muted" style={{ letterSpacing: "0.1em" }}>
          {g.config.mode === "highlow"
            ? "HIGH-LOW"
            : g.config.mode === "atc"
            ? "ATC"
            : `${g.config.startingScore}`}
        </div>
        {interactive && <ChevronRight className="w-3.5 h-3.5 text-muted" />}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/Avatar";
import { GameRow, timeAgo } from "@/components/history/GameRow";
import { StatBox } from "@/components/history/HistoryPage";
import { displayName as dn } from "@/lib/display";
import { aggregateRankedStats, rankedFilter, recentForm } from "@/lib/stats";
import type { GameHistoryItem } from "@/lib/db/history";
import type { HeadToHead, User } from "@/lib/types";

interface Props {
  target: User;
  viewer: User;
  games: GameHistoryItem[];
  h2h: HeadToHead | null;
}

function joinedSince(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

export function PlayerProfilePage({ target, viewer, games, h2h }: Props) {
  const router = useRouter();
  const isSelf = viewer.id === target.id;
  const targetName = dn(target.email, target.displayName);

  const stats = aggregateRankedStats(games);
  const form = recentForm(games, 10);
  const rankedRecent = rankedFilter(games).slice(0, 10);

  // Set of game ids the viewer participated in (for clickable rows on someone else's profile)
  const viewerParticipantIds = new Set<string>(h2h?.recent.map((m) => m.gameId) ?? []);
  const canLink = (gameId: string) => isSelf || viewerParticipantIds.has(gameId);

  return (
    <div className="min-h-screen flex flex-col bg-ink">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-soft">
        <BrandMark />
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 f-mono text-xs uppercase text-muted hover:text-cream"
          style={{ letterSpacing: "0.18em" }}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>

      <div className="flex-1 px-6 py-10 max-w-3xl w-full mx-auto">
        <div className="rise">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-10 bg-oche-red" />
            <span className="f-mono text-xs uppercase text-oche-red" style={{ letterSpacing: "0.25em" }}>
              player
            </span>
          </div>

          {/* Hero */}
          <div className="flex items-center gap-5 mb-8">
            <Avatar name={targetName} color={target.avatarColor} size="lg" />
            <div className="min-w-0">
              <h1
                className="f-display font-black leading-[0.9] text-cream uppercase truncate"
                style={{ fontSize: "clamp(32px, 5.5vw, 56px)" }}
              >
                {targetName}
              </h1>
              <div className="f-mono text-xs text-muted mt-1">{target.email}</div>
              <div className="f-mono text-[10px] uppercase text-muted mt-2" style={{ letterSpacing: "0.2em" }}>
                since {joinedSince(target.createdAt)}
                {isSelf && <span className="text-electric ml-2">· you</span>}
              </div>
            </div>
          </div>

          {/* StatBox row */}
          {stats.totalGames > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-10">
              <StatBox label="Games" value={String(stats.totalGames)} />
              <StatBox label="Win rate" value={`${stats.winRate}%`} highlight={stats.winRate >= 50} />
              <StatBox label="3-dart avg" value={stats.threeDartAvg} />
              <StatBox label="180s" value={String(stats.total180s)} accent={stats.total180s > 0} />
              <StatBox label="Best out" value={stats.bestFinish > 0 ? String(stats.bestFinish) : "—"} />
            </div>
          ) : (
            <div className="border border-border-soft px-5 py-6 mb-10 f-mono text-sm text-muted text-center" style={{ background: "#0d1210" }}>
              No ranked games yet.
            </div>
          )}

          {/* Recent form */}
          <Section label="Recent form">
            {form.length === 0 ? (
              <p className="f-mono text-xs text-muted">No ranked games yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {form.map((r, i) => (
                  <span
                    key={i}
                    className="f-mono font-bold text-xs flex items-center justify-center"
                    style={{
                      width: 24,
                      height: 24,
                      background: r === "win" ? "#d4ff3a" : "#e63946",
                      color: r === "win" ? "#0a0e0c" : "#f2e8d0",
                    }}
                    title={r === "win" ? "Win" : "Loss"}
                  >
                    {r === "win" ? "W" : "L"}
                  </span>
                ))}
              </div>
            )}
          </Section>

          {/* Head-to-head — only when viewing someone else and there's at least one meeting */}
          {!isSelf && h2h && h2h.gamesPlayed > 0 && (
            <Section label="Head-to-head vs you">
              <div className="grid grid-cols-3 gap-2 mb-3">
                <StatBox label="Games" value={String(h2h.gamesPlayed)} />
                <StatBox
                  label="Your win %"
                  value={`${Math.round((h2h.viewerWins / h2h.gamesPlayed) * 100)}%`}
                  highlight={h2h.viewerWins / h2h.gamesPlayed >= 0.5}
                />
                <StatBox
                  label="Last meeting"
                  value={h2h.lastMeeting ? timeAgo(h2h.lastMeeting) : "—"}
                />
              </div>
              <div className="space-y-1.5">
                {h2h.recent.map((m) => (
                  <Link
                    key={m.gameId}
                    href={`/history/${m.gameId}`}
                    className="border border-border-soft flex items-center justify-between px-4 py-2.5 gap-3 hover:border-border transition-colors"
                    style={{ background: m.viewerWon ? "#0f1a12" : "#0e1010" }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="f-mono font-bold text-xs flex items-center justify-center shrink-0"
                        style={{
                          width: 22,
                          height: 22,
                          background: m.viewerWon ? "#d4ff3a" : "#e63946",
                          color: m.viewerWon ? "#0a0e0c" : "#f2e8d0",
                        }}
                      >
                        {m.viewerWon ? "W" : "L"}
                      </span>
                      <span className="f-display font-black text-base text-cream">
                        {m.viewerLegs} — {m.targetLegs}
                      </span>
                    </div>
                    <span className="f-mono text-[11px] text-muted">{timeAgo(m.finishedAt)}</span>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {/* Recent matches */}
          <Section label="Recent matches" count={rankedRecent.length}>
            {rankedRecent.length === 0 ? (
              <p className="f-mono text-xs text-muted">No ranked games yet.</p>
            ) : (
              <div className="space-y-1.5">
                {rankedRecent.map((g) => (
                  <GameRow
                    key={g.id}
                    game={g}
                    href={canLink(g.id) ? `/history/${g.id}` : null}
                  />
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ label, count, children }: { label: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-px w-6 bg-border" />
        <span className="f-mono text-xs uppercase text-muted" style={{ letterSpacing: "0.25em" }}>
          {label}
        </span>
        {count !== undefined && count > 0 && (
          <span className="f-mono text-xs text-muted">({count})</span>
        )}
      </div>
      {children}
    </div>
  );
}

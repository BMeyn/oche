"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Trophy } from "lucide-react";
import { BrandMark } from "@/components/ui/primitives";
import type { GameHistoryItem, TournamentHistoryItem } from "@/lib/db/history";
import type { TournamentFormat, User } from "@/lib/types";
import { displayName as dn } from "@/lib/display";

interface Props {
  games: GameHistoryItem[];
  tournaments: TournamentHistoryItem[];
  user: User;
}

function timeAgo(date: Date | string): string {
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

function formatLabel(format: TournamentFormat): string {
  return format === "single_elim" ? "Single elim" : "Round robin";
}

function rankLabel(rank: number): string {
  if (rank === 1) return "1st";
  if (rank === 2) return "2nd";
  if (rank === 3) return "3rd";
  return `${rank}th`;
}

function rankColor(rank: number): string {
  if (rank === 1) return "#d4ff3a";
  if (rank === 2) return "#a8a8a8";
  if (rank === 3) return "#cd7f32";
  return "#6d736f";
}

export function HistoryPage({ games, tournaments, user }: Props) {
  const userEmail = user.email;
  const router = useRouter();

  // Aggregate stats
  const totalGames = games.length;
  const wins = games.filter((g) => g.result === "win").length;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  const avgSum = games.reduce((s, g) => s + g.threeDartAvg, 0);
  const avg = totalGames > 0 ? (avgSum / totalGames).toFixed(2) : "—";
  const total180s = games.reduce((s, g) => s + g.tonEighty, 0);
  const bestFinish = games.reduce((best, g) => (g.bestFinish > best ? g.bestFinish : best), 0);

  return (
    <div className="min-h-screen flex flex-col bg-ink">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-soft">
        <BrandMark />
        <button
          onClick={() => router.push("/lobby")}
          className="flex items-center gap-1.5 f-mono text-xs uppercase text-muted hover:text-cream"
          style={{ letterSpacing: "0.18em" }}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Lobby
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-10 max-w-3xl w-full mx-auto">
        <div className="rise">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-10 bg-oche-red" />
            <span className="f-mono text-xs uppercase text-oche-red" style={{ letterSpacing: "0.25em" }}>
              history
            </span>
          </div>

          <h1
            className="f-display font-black leading-[0.9] mb-2 text-cream"
            style={{ fontSize: "clamp(36px, 6vw, 72px)" }}
          >
            {dn(userEmail, user.displayName).toUpperCase()}
          </h1>
          <div className="f-serif italic text-bone text-lg mb-8">
            "all darts thrown."
          </div>

          {/* Aggregate stats */}
          {totalGames > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-10">
              <StatBox label="Games" value={String(totalGames)} />
              <StatBox label="Win rate" value={`${winRate}%`} highlight={winRate >= 50} />
              <StatBox label="3-dart avg" value={avg} />
              <StatBox label="180s" value={String(total180s)} accent={total180s > 0} />
            </div>
          )}

          {/* Games section */}
          <Section label="Games" count={games.length}>
            {games.length === 0 ? (
              <EmptyState text="No finished games yet." />
            ) : (
              <div className="space-y-1.5">
                {games.map((g) => (
                  <div
                    key={g.id}
                    className="border border-border-soft flex items-center justify-between px-4 py-3 gap-3"
                    style={{ background: g.result === "win" ? "#0f1a12" : "#0e1010" }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="f-display font-black text-base"
                          style={{ color: g.result === "win" ? "#d4ff3a" : "#e63946" }}
                        >
                          {g.result === "win" ? "W" : "L"}
                        </span>
                        <span className="f-display font-black text-cream text-base">
                          vs {g.opponent}
                        </span>
                        <span className="f-mono text-xs text-muted">
                          {g.legsWon}–{g.legsLost}
                        </span>
                      </div>
                      <div className="f-mono text-[11px] text-muted mt-0.5 flex items-center gap-3 flex-wrap">
                        <span>
                          avg{" "}
                          <span className="text-bone">{g.threeDartAvg.toFixed(2)}</span>
                        </span>
                        {g.tonEighty > 0 && (
                          <span className="text-oche-red font-bold">
                            {g.tonEighty} × 180
                          </span>
                        )}
                        {g.bestFinish > 0 && (
                          <span>
                            best out <span className="text-bone">{g.bestFinish}</span>
                          </span>
                        )}
                        <span className="ml-auto">{timeAgo(g.date)}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="f-mono text-[10px] text-muted" style={{ letterSpacing: "0.1em" }}>
                        {g.config.mode === "highlow"
                          ? "HIGH-LOW"
                          : `${g.config.startingScore}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Tournaments section */}
          <Section label="Tournaments" count={tournaments.length}>
            {tournaments.length === 0 ? (
              <EmptyState text="No finished tournaments yet." />
            ) : (
              <div className="space-y-1.5">
                {tournaments.map((t) => (
                  <div
                    key={t.id}
                    className="border border-border-soft flex items-center justify-between px-4 py-3 gap-3"
                    style={{ background: t.rank === 1 ? "#0f1a12" : "#0e1010" }}
                    role="button"
                    onClick={() => router.push(`/tournament/${t.id}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {t.rank === 1 && <Trophy className="w-4 h-4 text-electric shrink-0" />}
                        <span className="f-display font-black text-cream text-base">{t.name}</span>
                        <span
                          className="f-display font-black text-base"
                          style={{ color: rankColor(t.rank) }}
                        >
                          {rankLabel(t.rank)}
                        </span>
                      </div>
                      <div className="f-mono text-[11px] text-muted mt-0.5 flex items-center gap-3">
                        <span>{formatLabel(t.format)}</span>
                        <span>·</span>
                        <span>{t.playerCount} players</span>
                        <span>·</span>
                        <span>
                          {t.wins}W / {t.played}P
                        </span>
                        <span className="ml-auto">{timeAgo(t.date)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {totalGames === 0 && tournaments.length === 0 && (
            <div className="f-mono text-sm text-muted text-center py-16">
              No history yet. Play some games first!
            </div>
          )}

          {/* Best finish callout */}
          {bestFinish > 0 && (
            <div className="mt-8 border border-border-soft px-5 py-4 flex items-center gap-4" style={{ background: "#0d1210" }}>
              <div className="f-display font-black text-5xl text-electric">{bestFinish}</div>
              <div>
                <div className="f-mono text-[10px] uppercase text-muted" style={{ letterSpacing: "0.2em" }}>Best finish</div>
                <div className="f-serif italic text-bone text-sm mt-0.5">"that's a checkout."</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-px w-6 bg-border" />
        <span className="f-mono text-xs uppercase text-muted" style={{ letterSpacing: "0.25em" }}>
          {label}
        </span>
        {count > 0 && (
          <span className="f-mono text-xs text-muted">({count})</span>
        )}
      </div>
      {children}
    </div>
  );
}

function StatBox({ label, value, highlight, accent }: { label: string; value: string; highlight?: boolean; accent?: boolean }) {
  return (
    <div className="border border-border-soft p-4" style={{ background: "#0d1210" }}>
      <div className="f-mono text-[9px] uppercase text-muted mb-1" style={{ letterSpacing: "0.2em" }}>{label}</div>
      <div
        className="f-display font-black text-3xl"
        style={{ color: highlight ? "#d4ff3a" : accent ? "#e63946" : "#f2e8d0" }}
      >
        {value}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="f-mono text-xs text-muted py-4">{text}</p>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Trophy } from "lucide-react";
import type { Tournament } from "@/lib/types";
import { computeStandings } from "@/lib/tournament";
import { displayName as dn } from "@/lib/display";

function timeAgo(date: Date | string): string {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatLabel(t: Tournament): string {
  const fmt = t.format === "single_elim" ? "Single elim" : "Round robin";
  const mode = t.gameConfig.mode === "highlow" ? "High-Low" : `${t.gameConfig.startingScore}`;
  return `${fmt} · ${mode} · ${t.players.length} players`;
}

function tournamentWinner(t: Tournament): string | null {
  if (t.status !== "finished") return null;
  if (t.format === "single_elim") {
    const maxRound = Math.max(...t.matches.map((m) => m.round));
    const finalMatch = t.matches.find((m) => m.round === maxRound && m.status === "finished");
    if (!finalMatch?.winnerId) return null;
    const wp = t.players.find((p) => p.userId === finalMatch.winnerId);
    return wp ? dn(wp.email, wp.displayName) : null;
  }
  const standings = computeStandings(t.players, t.matches);
  const s = standings[0];
  return s ? dn(s.email, s.displayName) : null;
}

export function YourTournaments({ currentUserId }: { currentUserId: number }) {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  const fetchTournaments = useCallback(async () => {
    const res = await fetch("/api/tournaments");
    if (res.ok) setTournaments(await res.json());
  }, []);

  useEffect(() => {
    fetchTournaments();
    const interval = setInterval(fetchTournaments, 5000);
    return () => clearInterval(interval);
  }, [fetchTournaments]);

  if (tournaments.length === 0) return null;

  const active = tournaments.filter((t) => t.status !== "finished");
  const finished = tournaments.filter((t) => t.status === "finished");

  return (
    <div className="mt-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px w-10 bg-border" />
        <span className="f-mono text-xs uppercase text-muted" style={{ letterSpacing: "0.25em" }}>
          Your tournaments
        </span>
      </div>
      <div className="space-y-2">
        {active.map((t) => (
          <div
            key={t.id}
            className="border border-border-soft bg-surface flex items-center justify-between px-4 py-3 gap-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="f-display font-black text-cream text-lg">{t.name}</span>
                <span className="f-mono text-xs text-bone" style={{ letterSpacing: "0.05em" }}>
                  · {formatLabel(t)}
                </span>
              </div>
              <div className="f-mono text-[11px] text-muted mt-0.5 flex items-center gap-2">
                {t.status === "waiting" ? (
                  <>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-electric animate-pulse" />
                    Waiting for players
                  </>
                ) : (
                  <>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-oche-red" />
                    In progress
                  </>
                )}
                <span>· {timeAgo(t.createdAt)}</span>
                {t.creatorId === currentUserId && (
                  <span className="text-electric">· Host</span>
                )}
              </div>
            </div>
            <div className="shrink-0">
              <button
                onClick={() => router.push(`/tournament/${t.id}`)}
                className="f-display font-black text-sm uppercase px-4 py-2 border border-border-soft text-cream"
              >
                Open →
              </button>
            </div>
          </div>
        ))}

        {finished.map((t) => {
          const winner = tournamentWinner(t);
          return (
            <div
              key={t.id}
              className="border border-border-soft flex items-center justify-between px-4 py-3 gap-3"
              style={{ background: "#0d1210" }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="f-display font-black text-muted text-lg">{t.name}</span>
                  <span className="f-mono text-xs text-muted" style={{ letterSpacing: "0.05em" }}>
                    · {formatLabel(t)}
                  </span>
                </div>
                <div className="f-mono text-[11px] text-muted mt-0.5 flex items-center gap-2">
                  <Trophy className="w-3 h-3 text-electric" />
                  {winner ? (
                    <span>
                      <span className="text-electric">{winner}</span> won
                    </span>
                  ) : (
                    <span>Finished</span>
                  )}
                  <span>· {timeAgo(t.finishedAt ?? t.createdAt)}</span>
                </div>
              </div>
              <div className="shrink-0">
                <button
                  onClick={() => router.push(`/tournament/${t.id}`)}
                  className="f-mono text-xs uppercase px-4 py-2 border border-border-soft text-muted hover:text-cream"
                  style={{ letterSpacing: "0.1em" }}
                >
                  Results
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

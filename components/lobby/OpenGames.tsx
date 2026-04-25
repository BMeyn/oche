"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Game, GameConfig } from "@/lib/types";

function gameLabel(config: GameConfig): string {
  if (config.mode === "highlow") return "High-Low";
  const out = config.outRule === "double" ? "Double out" : config.outRule === "master" ? "Master out" : "Straight out";
  return `${config.startingScore} · ${out} · Best of ${config.legsToWin * 2 - 1}`;
}

function timeAgo(date: Date | string): string {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function opponentName(game: Game, currentUserId: number): string {
  if (game.player1Id === currentUserId) {
    return game.player2Email ? game.player2Email.split("@")[0] : "?";
  }
  return game.player1Email.split("@")[0];
}

export function OpenGames({ currentUserId }: { currentUserId: number }) {
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [leaving, setLeaving] = useState<string | null>(null);

  const fetchGames = useCallback(async () => {
    const res = await fetch("/api/games");
    if (res.ok) setGames(await res.json());
  }, []);

  useEffect(() => {
    fetchGames();
    const interval = setInterval(fetchGames, 5000);
    return () => clearInterval(interval);
  }, [fetchGames]);

  const leave = async (gameId: string) => {
    setLeaving(gameId);
    await fetch(`/api/games/${gameId}`, { method: "DELETE" });
    setGames((prev) => prev.filter((g) => g.id !== gameId));
    setLeaving(null);
  };

  if (games.length === 0) return null;

  return (
    <div className="mt-10">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px w-10 bg-border" />
        <span
          className="f-mono text-xs uppercase text-muted"
          style={{ letterSpacing: "0.25em" }}
        >
          Your games
        </span>
      </div>
      <div className="space-y-2">
        {games.map((game) => (
          <div
            key={game.id}
            className="border border-border-soft bg-surface flex items-center justify-between px-4 py-3 gap-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="f-mono text-xs text-muted">vs</span>
                <span className="f-display font-black text-cream text-lg">
                  {opponentName(game, currentUserId)}
                </span>
                <span className="f-mono text-xs text-bone" style={{ letterSpacing: "0.05em" }}>
                  · {gameLabel(game.config)}
                </span>
              </div>
              <div className="f-mono text-[11px] text-muted mt-0.5 flex items-center gap-2">
                {game.status === "waiting" ? (
                  <>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-electric animate-pulse" />
                    Waiting for opponent
                  </>
                ) : (
                  <>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-oche-red" />
                    In progress
                  </>
                )}
                <span>· {timeAgo(game.createdAt)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => leave(game.id)}
                disabled={leaving === game.id}
                className="f-mono text-xs uppercase text-muted hover:text-oche-red disabled:opacity-40"
                style={{ letterSpacing: "0.15em" }}
              >
                Leave
              </button>
              <button
                onClick={() => router.push(`/match/${game.id}`)}
                className="f-display font-black text-sm uppercase px-4 py-2 border border-border-soft text-cream"
              >
                Rejoin →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

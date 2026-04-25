"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check } from "lucide-react";
import type { Game, Match } from "@/lib/types";
import { MatchScreen } from "@/components/match/MatchScreen";
import { SummaryScreen } from "@/components/summary/SummaryScreen";
import { BrandMark } from "@/components/ui/primitives";

interface Props {
  game: Game;
  currentUserId: number;
}

function gameLabel(game: Game): string {
  const { config } = game;
  if (config.mode === "highlow") return "High-Low";
  const out = config.outRule === "double" ? "Double out" : config.outRule === "master" ? "Master out" : "Straight out";
  return `${config.startingScore} · ${out} · Best of ${config.legsToWin * 2 - 1}`;
}

export function MatchClient({ game: initialGame, currentUserId }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(initialGame.status);
  const [match, setMatch] = useState<Match | null>(initialGame.matchState);
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const gameId = initialGame.id;
  const isCreator = initialGame.player1Id === currentUserId;

  const poll = useCallback(async () => {
    const res = await fetch(`/api/games/${gameId}`);
    if (!res.ok) return;
    const g: Game = await res.json();
    setStatus(g.status);
    if (g.matchState) setMatch(g.matchState);
  }, [gameId]);

  useEffect(() => {
    if (status === "finished") {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(poll, 1500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [status, poll]);

  const proxySetMatch = useCallback((newMatch: Match) => {
    setMatch(newMatch);
    if (newMatch.winner !== null) setStatus("finished");
    fetch(`/api/games/${gameId}/state`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ match: newMatch }),
    }).catch(() => {});
  }, [gameId]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const join = async () => {
    setJoining(true);
    const res = await fetch(`/api/games/${gameId}/join`, { method: "POST" });
    if (res.ok) {
      const g: Game = await res.json();
      setStatus(g.status);
      if (g.matchState) setMatch(g.matchState);
    } else {
      setJoining(false);
    }
  };

  const goLobby = () => router.push("/lobby");

  // ── Visitor: invited player sees a join screen ────────────────────────────
  if (status === "waiting" && !isCreator) {
    return (
      <div className="min-h-screen flex flex-col bg-ink">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-soft">
          <BrandMark />
          <button onClick={goLobby} className="f-mono text-xs uppercase text-muted hover:text-cream" style={{ letterSpacing: "0.18em" }}>
            ← Lobby
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="rise">
            <div className="f-mono text-xs uppercase text-electric mb-6" style={{ letterSpacing: "0.3em" }}>
              Game invitation
            </div>
            <div className="f-display font-black text-cream leading-[0.9] mb-4" style={{ fontSize: "clamp(48px, 8vw, 100px)" }}>
              {initialGame.player1Email.split("@")[0].toUpperCase()}<br />
              <span className="text-electric">CHALLENGES</span><br />
              YOU.
            </div>
            <p className="f-mono text-sm text-bone mb-10">
              {gameLabel(initialGame)}
            </p>
            <button
              onClick={join}
              disabled={joining}
              className="f-display font-black text-2xl uppercase px-10 py-5"
              style={{
                background: joining ? "#454b47" : "#d4ff3a",
                color: joining ? "#6d736f" : "#0a0e0c",
              }}
            >
              {joining ? "Joining…" : "Accept →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Creator: waiting for opponent, show copy link ─────────────────────────
  if (status === "waiting" && isCreator) {
    return (
      <div className="min-h-screen flex flex-col bg-ink">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-soft">
          <BrandMark />
          <button onClick={goLobby} className="f-mono text-xs uppercase text-muted hover:text-cream" style={{ letterSpacing: "0.18em" }}>
            ← Lobby
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="rise">
            <div className="f-mono text-xs uppercase text-electric mb-6" style={{ letterSpacing: "0.3em" }}>
              Waiting for opponent
            </div>
            <div className="f-display font-black text-cream leading-[0.9] mb-8" style={{ fontSize: "clamp(48px, 8vw, 100px)" }}>
              YOUR GAME<br />IS <span className="text-electric">READY.</span>
            </div>
            <p className="f-mono text-sm text-bone mb-8 max-w-sm mx-auto">
              Share this link with your opponent. The match starts as soon as they accept.
            </p>
            <button
              onClick={copyLink}
              className="flex items-center gap-3 mx-auto f-mono text-sm px-6 py-3.5 border"
              style={{
                borderColor: copied ? "#d4ff3a" : "#2a332d",
                color: copied ? "#d4ff3a" : "#d8cdaf",
                background: "#141a17",
              }}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy invite link"}
            </button>
            <div className="mt-8 flex justify-center">
              <div className="live-dot w-2 h-2 rounded-full bg-electric" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Match finished ────────────────────────────────────────────────────────
  if (status === "finished" && match?.winner != null) {
    return <SummaryScreen match={match} onRestart={goLobby} onNewMatch={goLobby} />;
  }

  // ── Active match ──────────────────────────────────────────────────────────
  if (status === "active" && match) {
    return (
      <MatchScreen
        match={match}
        setMatch={proxySetMatch}
        onFinish={proxySetMatch}
        onExit={goLobby}
      />
    );
  }

  // Transitioning state
  return (
    <div className="min-h-screen flex items-center justify-center bg-ink">
      <div className="live-dot w-2 h-2 rounded-full bg-electric" />
    </div>
  );
}

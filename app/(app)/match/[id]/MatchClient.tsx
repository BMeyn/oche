"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check } from "lucide-react";
import type { FriendEntry, Game, Match } from "@/lib/types";
import { MatchScreen } from "@/components/match/MatchScreen";
import { SummaryScreen } from "@/components/summary/SummaryScreen";
import { BrandMark } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/Avatar";
import { displayName } from "@/lib/display";

interface Props {
  game: Game;
  currentUserId: number;
  tournamentId?: string;
}

function gameLabel(game: Game): string {
  const { config } = game;
  if (config.mode === "highlow") return "High-Low";
  const out = config.outRule === "double" ? "Double out" : config.outRule === "master" ? "Master out" : "Straight out";
  return `${config.startingScore} · ${out} · Best of ${config.legsToWin * 2 - 1}`;
}

export function MatchClient({ game: initialGame, currentUserId, tournamentId }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(initialGame.status);
  const [match, setMatch] = useState<Match | null>(initialGame.matchState);
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedFor, setCopiedFor] = useState<number | null>(null);
  const [friends, setFriends] = useState<FriendEntry[]>([]);
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

  useEffect(() => {
    if (!isCreator) return;
    fetch("/api/friends")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.friends) setFriends(data.friends); })
      .catch(() => {});
  }, [isCreator]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLinkFor = (friendId: number) => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedFor(friendId);
    setTimeout(() => setCopiedFor(null), 2000);
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
            {friends.length > 0 && (
              <div className="mt-8 max-w-xs mx-auto text-left">
                <div className="f-mono text-[10px] uppercase text-muted mb-3" style={{ letterSpacing: "0.2em" }}>
                  Invite a friend
                </div>
                <div className="space-y-2">
                  {friends.map((f) => {
                    const name = displayName(f.email, f.displayName);
                    const isCopied = copiedFor === f.userId;
                    return (
                      <div
                        key={f.userId}
                        className="flex items-center justify-between gap-3 border border-border-soft px-3 py-2.5"
                        style={{ background: "#141a17" }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar name={name} color={f.avatarColor} size="sm" />
                          <span className="f-display font-black text-sm text-cream truncate">{name}</span>
                        </div>
                        <button
                          onClick={() => copyLinkFor(f.userId)}
                          className="f-mono text-[10px] uppercase shrink-0"
                          style={{
                            color: isCopied ? "#d4ff3a" : "#6d736f",
                            letterSpacing: "0.15em",
                          }}
                        >
                          {isCopied ? "Copied!" : "Copy link →"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
    return (
      <SummaryScreen
        match={match}
        onRestart={goLobby}
        onNewMatch={goLobby}
        onBackToTournament={tournamentId ? () => router.push(`/tournament/${tournamentId}`) : undefined}
      />
    );
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

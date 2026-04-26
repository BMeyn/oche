"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Trophy, UserPlus } from "lucide-react";
import type { FriendEntry, Tournament, User } from "@/lib/types";
import { TournamentBracket } from "@/components/tournament/TournamentBracket";
import { TournamentStandings } from "@/components/tournament/TournamentStandings";
import { BrandMark, Tag } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/Avatar";
import { displayName as dn } from "@/lib/display";
import { computeRankings } from "@/lib/tournament";

interface Props {
  tournament: Tournament;
  currentUserId: number;
  user: User;
}

function gameLabel(t: Tournament): string {
  const { gameConfig: c } = t;
  if (c.mode === "highlow") return "High-Low";
  const out = c.outRule === "double" ? "Double out" : c.outRule === "master" ? "Master out" : "Straight out";
  return `${c.startingScore} · ${out} · Best of ${c.legsToWin * 2 - 1}`;
}

export function TournamentClient({ tournament: initial, currentUserId, user }: Props) {
  const router = useRouter();
  const [t, setT] = useState<Tournament>(initial);
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [joining, setJoining] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [inviting, setInviting] = useState<Record<number, boolean>>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userName = dn(user.email, user.displayName);

  const isPlayer = t.players.some((p) => p.userId === currentUserId);
  const isCreator = t.creatorId === currentUserId;

  const poll = useCallback(async () => {
    const res = await fetch(`/api/tournaments/${t.id}`);
    if (!res.ok) return;
    setT(await res.json());
  }, [t.id]);

  useEffect(() => {
    if (t.status === "finished") {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(poll, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [t.status, poll]);

  useEffect(() => {
    if (!isCreator) return;
    fetch("/api/friends")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.friends) setFriends(data.friends); })
      .catch(() => {});
  }, [isCreator]);

  const inviteFriend = async (friendId: number) => {
    setInviting((prev) => ({ ...prev, [friendId]: true }));
    const res = await fetch(`/api/tournaments/${t.id}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: friendId }),
    });
    if (res.ok) setT(await res.json());
    setInviting((prev) => ({ ...prev, [friendId]: false }));
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const join = async () => {
    setJoining(true);
    const res = await fetch(`/api/tournaments/${t.id}/join`, { method: "POST" });
    if (res.ok) setT(await res.json());
    setJoining(false);
  };

  const start = async () => {
    setStarting(true);
    const res = await fetch(`/api/tournaments/${t.id}/start`, { method: "POST" });
    if (res.ok) setT(await res.json());
    else setStarting(false);
  };

  const cancel = async () => {
    setCancelling(true);
    const res = await fetch(`/api/tournaments/${t.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/lobby");
    } else {
      setCancelling(false);
      setConfirmCancel(false);
    }
  };

  const playMatch = useCallback(async (matchId: string) => {
    const res = await fetch(`/api/tournaments/${t.id}/matches/${matchId}/start`, {
      method: "POST",
    });
    if (res.ok) {
      const { gameId } = await res.json();
      router.push(`/match/${gameId}?tournament=${t.id}`);
    }
  }, [t.id, router]);

  const header = (
    <div className="flex items-center justify-between px-6 py-4 border-b border-border-soft">
      <BrandMark />
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/settings")}
          className="flex items-center gap-2 text-muted hover:text-cream"
        >
          <Avatar name={userName} color={user.avatarColor} size="sm" />
          <span className="f-mono text-xs text-bone hidden sm:block">{userName}</span>
        </button>
        <button
          onClick={() => router.push("/lobby")}
          className="f-mono text-xs uppercase text-muted hover:text-cream"
          style={{ letterSpacing: "0.18em" }}
        >
          ← Lobby
        </button>
      </div>
    </div>
  );

  // ── Non-player visit: join screen ─────────────────────────────────────────
  if (!isPlayer && t.status === "waiting") {
    return (
      <div className="min-h-screen flex flex-col bg-ink">
        {header}
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="rise">
            <div className="f-mono text-xs uppercase text-electric mb-6" style={{ letterSpacing: "0.3em" }}>
              Tournament invite
            </div>
            <div className="f-display font-black text-cream leading-[0.9] mb-4" style={{ fontSize: "clamp(40px, 6vw, 80px)" }}>
              {t.name.toUpperCase()}
            </div>
            <p className="f-mono text-sm text-bone mb-3">{gameLabel(t)}</p>
            <p className="f-mono text-sm text-muted mb-10">
              {t.players.length} / {t.maxPlayers} players joined
            </p>
            <button
              onClick={join}
              disabled={joining || t.players.length >= t.maxPlayers}
              className="f-display font-black text-2xl uppercase px-10 py-5"
              style={{
                background: joining ? "#454b47" : "#d4ff3a",
                color: joining ? "#6d736f" : "#0a0e0c",
                cursor: joining ? "not-allowed" : "pointer",
              }}
            >
              {joining ? "Joining…" : "Join tournament →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Waiting room ──────────────────────────────────────────────────────────
  if (t.status === "waiting") {
    return (
      <div className="min-h-screen flex flex-col bg-ink">
        {header}
        <div className="flex-1 px-6 py-10 max-w-2xl w-full mx-auto">
          <div className="rise">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-10 bg-oche-red" />
              <span className="f-mono text-xs uppercase text-oche-red" style={{ letterSpacing: "0.25em" }}>
                tournament · waiting
              </span>
            </div>

            <div className="f-display font-black leading-[0.9] mb-2 text-cream" style={{ fontSize: "clamp(32px, 5vw, 64px)" }}>
              {t.name.toUpperCase()}
            </div>
            <div className="flex items-center gap-3 mb-8">
              <Tag color={t.format === "single_elim" ? "#d4ff3a" : "#e63946"}>
                {t.format === "single_elim" ? "Single elim" : "Round robin"}
              </Tag>
              <span className="f-mono text-xs text-muted">{gameLabel(t)}</span>
            </div>

            {/* Player list */}
            <div className="mb-8">
              <div className="f-mono text-[10px] uppercase text-muted mb-3" style={{ letterSpacing: "0.2em" }}>
                Players · {t.players.length} / {t.maxPlayers}
              </div>
              <div className="space-y-1.5">
                {t.players.map((p) => (
                  <div key={p.userId} className="flex items-center gap-2 px-3 py-2 border border-border-soft bg-surface">
                    <span className="f-display font-black text-base text-cream">
                      {dn(p.email, p.displayName)}
                    </span>
                    {p.userId === t.creatorId && (
                      <span className="f-mono text-[9px] uppercase text-electric" style={{ letterSpacing: "0.15em" }}>
                        host
                      </span>
                    )}
                  </div>
                ))}
                {Array.from({ length: t.maxPlayers - t.players.length }).map((_, i) => (
                  <div key={i} className="px-3 py-2 border border-border-soft" style={{ background: "#0d1210" }}>
                    <span className="f-mono text-xs text-muted">Open slot</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Friend invite (creator only) */}
            {isCreator && (() => {
              const joinedIds = new Set(t.players.map((p) => p.userId));
              const uninvited = friends.filter((f) => !joinedIds.has(f.userId));
              if (uninvited.length === 0) return null;
              const isFull = t.players.length >= t.maxPlayers;
              return (
                <div className="mb-6">
                  <div className="f-mono text-[10px] uppercase text-muted mb-3" style={{ letterSpacing: "0.2em" }}>
                    Add from friends
                  </div>
                  <div className="space-y-1.5">
                    {uninvited.map((f) => {
                      const name = dn(f.email, f.displayName);
                      const busy = inviting[f.userId];
                      return (
                        <div
                          key={f.userId}
                          className="flex items-center justify-between gap-3 border border-border-soft px-3 py-2.5"
                          style={{ background: "#0d1210" }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar name={name} color={f.avatarColor} size="sm" />
                            <span className="f-display font-black text-sm text-cream truncate">{name}</span>
                          </div>
                          <button
                            onClick={() => inviteFriend(f.userId)}
                            disabled={busy || isFull}
                            className="flex items-center gap-1.5 f-mono text-[10px] uppercase shrink-0"
                            style={{
                              color: isFull ? "#454b47" : busy ? "#6d736f" : "#d4ff3a",
                              letterSpacing: "0.15em",
                              cursor: busy || isFull ? "not-allowed" : "pointer",
                            }}
                          >
                            <UserPlus className="w-3 h-3" />
                            {busy ? "Adding…" : isFull ? "Full" : "Add →"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Invite link */}
            <div className="mb-6">
              <button
                onClick={copyLink}
                className="flex items-center gap-3 f-mono text-sm px-5 py-3 border"
                style={{
                  borderColor: copied ? "#d4ff3a" : "#2a332d",
                  color: copied ? "#d4ff3a" : "#d8cdaf",
                  background: "#141a17",
                }}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy invite link"}
              </button>
            </div>

            {/* Start button (creator only) */}
            {isCreator && (
              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={start}
                  disabled={starting || t.players.length < 2}
                  className="f-display font-black text-xl uppercase px-8 py-4"
                  style={{
                    background: starting || t.players.length < 2 ? "#454b47" : "#d4ff3a",
                    color: starting || t.players.length < 2 ? "#6d736f" : "#0a0e0c",
                    cursor: starting || t.players.length < 2 ? "not-allowed" : "pointer",
                  }}
                >
                  {starting ? "Starting…" : `Start tournament →`}
                </button>
                {confirmCancel ? (
                  <div className="flex items-center gap-3">
                    <span className="f-mono text-xs text-muted">Cancel tournament?</span>
                    <button
                      onClick={cancel}
                      disabled={cancelling}
                      className="f-mono text-xs uppercase text-oche-red hover:text-cream"
                      style={{ letterSpacing: "0.15em" }}
                    >
                      {cancelling ? "Cancelling…" : "Yes, cancel"}
                    </button>
                    <button
                      onClick={() => setConfirmCancel(false)}
                      className="f-mono text-xs uppercase text-muted hover:text-cream"
                      style={{ letterSpacing: "0.15em" }}
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmCancel(true)}
                    className="f-mono text-xs uppercase text-muted hover:text-oche-red"
                    style={{ letterSpacing: "0.15em" }}
                  >
                    Cancel tournament
                  </button>
                )}
              </div>
            )}
            {!isCreator && (
              <div className="flex items-center gap-2 mt-4">
                <div className="live-dot w-1.5 h-1.5 rounded-full bg-electric" />
                <span className="f-mono text-xs text-muted">Waiting for host to start</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Finished ──────────────────────────────────────────────────────────────
  if (t.status === "finished") {
    return <FinishedView t={t} currentUserId={currentUserId} onPlayMatch={playMatch} header={header} />;
  }

  // ── Active ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-ink">
      {header}
      <div className="flex-1 px-6 py-10 max-w-4xl w-full mx-auto">
        <div className="rise">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-10 bg-oche-red" />
            <span className="f-mono text-xs uppercase text-oche-red" style={{ letterSpacing: "0.25em" }}>
              tournament · in progress
            </span>
          </div>

          <div className="flex items-end justify-between mb-6">
            <div>
              <div className="f-display font-black text-cream leading-[0.9]" style={{ fontSize: "clamp(28px, 4vw, 56px)" }}>
                {t.name.toUpperCase()}
              </div>
              <div className="flex items-center gap-3 mt-2">
                <Tag color={t.format === "single_elim" ? "#d4ff3a" : "#e63946"}>
                  {t.format === "single_elim" ? "Single elim" : "Round robin"}
                </Tag>
                <span className="f-mono text-xs text-muted">{gameLabel(t)}</span>
              </div>
            </div>
          </div>

          {t.format === "single_elim" ? (
            <TournamentBracket tournament={t} currentUserId={currentUserId} onPlayMatch={playMatch} />
          ) : (
            <TournamentStandings tournament={t} currentUserId={currentUserId} onPlayMatch={playMatch} />
          )}

          {isCreator && (
            <div className="mt-8 pt-6 border-t border-border-soft flex items-center gap-4">
              {confirmCancel ? (
                <>
                  <span className="f-mono text-xs text-muted">Cancel and delete this tournament?</span>
                  <button
                    onClick={cancel}
                    disabled={cancelling}
                    className="f-mono text-xs uppercase text-oche-red hover:text-cream"
                    style={{ letterSpacing: "0.15em" }}
                  >
                    {cancelling ? "Cancelling…" : "Yes, cancel"}
                  </button>
                  <button
                    onClick={() => setConfirmCancel(false)}
                    className="f-mono text-xs uppercase text-muted hover:text-cream"
                    style={{ letterSpacing: "0.15em" }}
                  >
                    No
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmCancel(true)}
                  className="f-mono text-xs uppercase text-muted hover:text-oche-red"
                  style={{ letterSpacing: "0.15em" }}
                >
                  Cancel tournament
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Finished tournament results view ─────────────────────────────────────────

function eliminationLabel(round: number, maxRound: number): string {
  const diff = maxRound - round;
  if (diff === 0) return "Final";
  if (diff === 1) return "Semi-final";
  if (diff === 2) return "Quarter-final";
  return `Round ${round}`;
}

const RANK_COLORS: Record<number, string> = { 1: "#d4ff3a", 2: "#a8a8a8", 3: "#cd7f32" };

function FinishedView({
  t,
  currentUserId,
  onPlayMatch,
  header,
}: {
  t: Tournament;
  currentUserId: number;
  onPlayMatch: (matchId: string) => Promise<void>;
  header: React.ReactNode;
}) {
  const router = useRouter();
  const rankings = useMemo(
    () => computeRankings(t.players, t.matches, t.format),
    [t.players, t.matches, t.format],
  );
  const playerNameMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of t.players) map.set(p.userId, dn(p.email, p.displayName));
    return map;
  }, [t.players]);
  const champion = rankings[0];
  const maxRound = t.matches.length ? Math.max(...t.matches.map((m) => m.round)) : 1;

  return (
    <div className="min-h-screen flex flex-col bg-ink">
      {header}
      <div className="flex-1 px-6 py-10 max-w-3xl w-full mx-auto">
        <div className="rise">
          {/* Label */}
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px w-10 bg-electric" />
            <span className="f-mono text-xs uppercase text-electric" style={{ letterSpacing: "0.25em" }}>
              tournament complete · {t.name}
            </span>
          </div>

          {/* Champion moment */}
          <div className="bang mb-10">
            <div className="f-display font-black leading-[0.88] text-cream" style={{ fontSize: "clamp(64px, 11vw, 160px)" }}>
              {champion ? (playerNameMap.get(champion.userId) ?? champion.email.split("@")[0]).toUpperCase() : "—"}
            </div>
            <div className="f-display font-black leading-[0.9] mt-2 text-electric" style={{ fontSize: "clamp(36px, 6vw, 96px)" }}>
              TAKES IT ALL.
            </div>
            <div className="f-serif italic text-xl mt-4 text-bone">"tournament champion."</div>
          </div>

          {/* Final standings / rankings */}
          <div className="mb-10">
            <div className="f-mono text-[10px] uppercase text-muted mb-3" style={{ letterSpacing: "0.2em" }}>
              Final standings
            </div>
            <div className="border border-border-soft overflow-hidden">
              {/* Header */}
              <div
                className="grid f-mono text-[10px] uppercase text-muted px-4 py-2"
                style={{
                  gridTemplateColumns: t.format === "round_robin"
                    ? "2.5rem 1fr 3rem 3rem 4rem"
                    : "2.5rem 1fr 3rem 3rem 7rem",
                  letterSpacing: "0.15em",
                  background: "#141a17",
                }}
              >
                <span>#</span>
                <span>Player</span>
                <span className="text-center">W</span>
                <span className="text-center">P</span>
                <span className="text-right">
                  {t.format === "round_robin" ? "Win%" : "Reached"}
                </span>
              </div>

              {rankings.map((r) => {
                const color = RANK_COLORS[r.rank] ?? "#454b47";
                const winPct = r.played > 0 ? Math.round((r.wins / r.played) * 100) : 0;
                return (
                  <div
                    key={r.userId}
                    className="grid items-center px-4 py-3.5 border-t border-border-soft"
                    style={{
                      gridTemplateColumns: t.format === "round_robin"
                        ? "2.5rem 1fr 3rem 3rem 4rem"
                        : "2.5rem 1fr 3rem 3rem 7rem",
                      background: r.rank === 1 ? "#1c2420" : "#0a0e0c",
                    }}
                  >
                    <span className="f-display font-black text-lg" style={{ color }}>{r.rank}</span>
                    <span className="f-display font-black text-lg" style={{ color: r.rank <= 3 ? color : "#f2e8d0" }}>
                      {playerNameMap.get(r.userId) ?? r.email.split("@")[0]}
                    </span>
                    <span className="f-display font-black text-base text-center" style={{ color: r.rank === 1 ? "#d4ff3a" : "#f2e8d0" }}>
                      {r.wins}
                    </span>
                    <span className="f-mono text-xs text-center text-muted">{r.played}</span>
                    <span className="f-mono text-xs text-right" style={{ color: r.rank === 1 ? "#d4ff3a" : "#6d736f" }}>
                      {t.format === "round_robin"
                        ? `${winPct}%`
                        : r.rank === 1
                          ? "Champion"
                          : r.eliminatedRound !== undefined
                            ? eliminationLabel(r.eliminatedRound, maxRound)
                            : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Final bracket / standings (collapsed, for reference) */}
          <details className="mb-8">
            <summary className="f-mono text-[10px] uppercase text-muted cursor-pointer mb-3" style={{ letterSpacing: "0.2em" }}>
              {t.format === "single_elim" ? "Full bracket" : "All matches"} ↓
            </summary>
            <div className="mt-3">
              {t.format === "single_elim" ? (
                <TournamentBracket tournament={t} currentUserId={currentUserId} onPlayMatch={onPlayMatch} />
              ) : (
                <TournamentStandings tournament={t} currentUserId={currentUserId} onPlayMatch={onPlayMatch} />
              )}
            </div>
          </details>

          <button
            onClick={() => router.push("/lobby")}
            className="f-mono text-sm uppercase px-6 py-3.5 border border-border text-cream flex items-center gap-2"
            style={{ letterSpacing: "0.22em" }}
          >
            ← Back to lobby
          </button>
        </div>
      </div>
    </div>
  );
}

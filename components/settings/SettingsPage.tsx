"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserPlus, Check, X, Trash2 } from "lucide-react";
import { BrandMark } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/Avatar";
import type { User, FriendEntry } from "@/lib/types";
import { displayName as dn } from "@/lib/display";

const PALETTE = [
  { hex: "#d4ff3a", label: "Electric" },
  { hex: "#e63946", label: "Red" },
  { hex: "#4ecdc4", label: "Teal" },
  { hex: "#f7931e", label: "Orange" },
  { hex: "#9b59b6", label: "Purple" },
  { hex: "#3498db", label: "Blue" },
  { hex: "#f2e8d0", label: "Cream" },
  { hex: "#6d736f", label: "Grey" },
];

interface Props {
  user: User;
  friends: FriendEntry[];
  requests: FriendEntry[];
}

export function SettingsPage({ user, friends: initialFriends, requests: initialRequests }: Props) {
  const router = useRouter();

  // Profile state
  const [nameInput, setNameInput] = useState(user.displayName ?? "");
  const [color, setColor] = useState(user.avatarColor);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Friends state
  const [friends, setFriends] = useState<FriendEntry[]>(initialFriends);
  const [requests, setRequests] = useState<FriendEntry[]>(initialRequests);
  const [addEmail, setAddEmail] = useState("");
  const [addError, setAddError] = useState("");
  const [addSending, setAddSending] = useState(false);

  const previewName = nameInput.trim() || dn(user.email, null);

  const refreshFriends = useCallback(async () => {
    const res = await fetch("/api/friends");
    if (res.ok) {
      const data = await res.json();
      setFriends(data.friends);
      setRequests(data.requests);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(refreshFriends, 10000);
    return () => clearInterval(interval);
  }, [refreshFriends]);

  async function saveProfile() {
    setSaving(true);
    setSaveMsg("");
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: nameInput.trim() || null,
        avatarColor: color,
      }),
    });
    setSaving(false);
    setSaveMsg(res.ok ? "Saved!" : "Error saving");
    setTimeout(() => setSaveMsg(""), 2000);
  }

  async function sendRequest() {
    setAddError("");
    setAddSending(true);
    const res = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: addEmail }),
    });
    setAddSending(false);
    if (res.ok) {
      setAddEmail("");
      await refreshFriends();
    } else {
      const data = await res.json().catch(() => ({}));
      setAddError(data.error ?? "Failed to send request");
    }
  }

  async function respond(requestId: number, action: "accept" | "decline") {
    await fetch(`/api/friends/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await refreshFriends();
  }

  async function remove(requestId: number, friendId: number) {
    await fetch(`/api/friends/${requestId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendId }),
    });
    await refreshFriends();
  }

  async function cancelRequest(requestId: number) {
    await fetch(`/api/friends/${requestId}`, { method: "DELETE" });
    await refreshFriends();
  }

  // Leaderboard: accepted friends + self
  const leaderboardEntries = [
    {
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarColor: user.avatarColor,
      gamesPlayed: undefined as number | undefined,
      winRate: undefined as number | undefined,
      threeDartAvg: undefined as number | undefined,
      isSelf: true,
    },
    ...friends.map((f) => ({ ...f, isSelf: false })),
  ].sort((a, b) => (b.winRate ?? -1) - (a.winRate ?? -1));

  const incoming = requests.filter((r) => r.direction === "incoming");
  const outgoing = requests.filter((r) => r.direction === "outgoing");

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

      <div className="flex-1 px-6 py-10 max-w-2xl w-full mx-auto">
        <div className="rise">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-10 bg-oche-red" />
            <span className="f-mono text-xs uppercase text-oche-red" style={{ letterSpacing: "0.25em" }}>
              settings
            </span>
          </div>

          {/* ── Profile ── */}
          <Section label="Profile">
            <div className="flex items-center gap-4 mb-6">
              <Avatar name={previewName} color={color} size="lg" />
              <div>
                <div className="f-display font-black text-cream text-2xl leading-tight">{previewName.toUpperCase()}</div>
                <div className="f-mono text-xs text-muted mt-0.5">{user.email}</div>
              </div>
            </div>

            <div className="mb-4">
              <label className="f-mono text-[10px] uppercase text-muted block mb-1.5" style={{ letterSpacing: "0.2em" }}>
                Display name
              </label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={30}
                placeholder={dn(user.email, null)}
                className="w-full bg-surface border border-border-soft px-4 py-2.5 f-mono text-sm text-cream placeholder:text-muted focus:outline-none focus:border-electric"
              />
            </div>

            <div className="mb-6">
              <label className="f-mono text-[10px] uppercase text-muted block mb-2" style={{ letterSpacing: "0.2em" }}>
                Colour
              </label>
              <div className="flex gap-2 flex-wrap">
                {PALETTE.map((p) => (
                  <button
                    key={p.hex}
                    onClick={() => setColor(p.hex)}
                    title={p.label}
                    className="w-8 h-8 transition-all"
                    style={{
                      background: p.hex,
                      outline: color === p.hex ? "2px solid #f2e8d0" : "2px solid transparent",
                      outlineOffset: "2px",
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={saveProfile}
                disabled={saving}
                className="f-display font-black text-lg uppercase px-6 py-3 disabled:opacity-50"
                style={{ background: "#d4ff3a", color: "#0a0e0c" }}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              {saveMsg && (
                <span className="f-mono text-sm text-electric">{saveMsg}</span>
              )}
            </div>
          </Section>

          {/* ── Friends ── */}
          <Section label="Friends">
            {/* Add friend */}
            <div className="mb-5">
              <label className="f-mono text-[10px] uppercase text-muted block mb-1.5" style={{ letterSpacing: "0.2em" }}>
                Add by email
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={addEmail}
                  onChange={(e) => { setAddEmail(e.target.value); setAddError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && sendRequest()}
                  placeholder="friend@example.com"
                  className="flex-1 bg-surface border border-border-soft px-4 py-2.5 f-mono text-sm text-cream placeholder:text-muted focus:outline-none focus:border-electric"
                />
                <button
                  onClick={sendRequest}
                  disabled={addSending || !addEmail}
                  className="flex items-center gap-2 f-display font-black text-base uppercase px-4 py-2 border border-border-soft text-cream disabled:opacity-40"
                >
                  <UserPlus className="w-4 h-4" strokeWidth={2} />
                  {addSending ? "…" : "Send"}
                </button>
              </div>
              {addError && (
                <p className="f-mono text-xs text-oche-red mt-1.5">{addError}</p>
              )}
            </div>

            {/* Incoming requests */}
            {incoming.length > 0 && (
              <div className="mb-4">
                <div className="f-mono text-[10px] uppercase text-muted mb-2" style={{ letterSpacing: "0.18em" }}>
                  Incoming requests
                </div>
                <div className="space-y-1.5">
                  {incoming.map((r) => (
                    <div key={r.requestId} className="border border-border-soft flex items-center justify-between px-4 py-3 gap-3" style={{ background: "#0f1a12" }}>
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={dn(r.email, r.displayName)} color={r.avatarColor} />
                        <div>
                          <div className="f-display font-black text-cream text-base">{dn(r.email, r.displayName)}</div>
                          <div className="f-mono text-[11px] text-muted">{r.email}</div>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => respond(r.requestId, "accept")}
                          className="flex items-center gap-1.5 f-mono text-xs uppercase px-3 py-2"
                          style={{ background: "#d4ff3a", color: "#0a0e0c", letterSpacing: "0.12em" }}
                        >
                          <Check className="w-3.5 h-3.5" strokeWidth={3} /> Accept
                        </button>
                        <button
                          onClick={() => respond(r.requestId, "decline")}
                          className="flex items-center gap-1.5 f-mono text-xs uppercase px-3 py-2 border border-border-soft text-muted hover:text-cream"
                          style={{ letterSpacing: "0.12em" }}
                        >
                          <X className="w-3.5 h-3.5" /> Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Outgoing pending */}
            {outgoing.length > 0 && (
              <div className="mb-4">
                <div className="f-mono text-[10px] uppercase text-muted mb-2" style={{ letterSpacing: "0.18em" }}>
                  Sent requests
                </div>
                <div className="space-y-1.5">
                  {outgoing.map((r) => (
                    <div key={r.requestId} className="border border-border-soft flex items-center justify-between px-4 py-3 gap-3" style={{ background: "#0d1210" }}>
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={dn(r.email, r.displayName)} color={r.avatarColor} />
                        <div>
                          <div className="f-display font-black text-muted text-base">{dn(r.email, r.displayName)}</div>
                          <div className="f-mono text-[11px] text-muted">{r.email} · awaiting</div>
                        </div>
                      </div>
                      <button
                        onClick={() => cancelRequest(r.requestId)}
                        className="f-mono text-[11px] uppercase text-muted hover:text-oche-red shrink-0"
                        style={{ letterSpacing: "0.1em" }}
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Friends list */}
            {friends.length > 0 ? (
              <div className="space-y-1.5">
                {friends.map((f) => (
                  <div key={f.requestId} className="border border-border-soft flex items-center justify-between px-4 py-3 gap-3" style={{ background: "#0d1210" }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={dn(f.email, f.displayName)} color={f.avatarColor} />
                      <div>
                        <div className="f-display font-black text-cream text-base">{dn(f.email, f.displayName)}</div>
                        <div className="f-mono text-[11px] text-muted flex gap-3">
                          <span>{f.email}</span>
                          {f.gamesPlayed !== undefined && f.gamesPlayed > 0 && (
                            <>
                              <span>·</span>
                              <span>{f.gamesPlayed} games</span>
                              <span>·</span>
                              <span style={{ color: (f.winRate ?? 0) >= 50 ? "#d4ff3a" : "#f2e8d0" }}>
                                {f.winRate}% wins
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => remove(f.requestId, f.userId)}
                      className="text-muted hover:text-oche-red shrink-0"
                      title="Remove friend"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : incoming.length === 0 && outgoing.length === 0 ? (
              <p className="f-mono text-xs text-muted">No friends yet. Add someone by email above.</p>
            ) : null}
          </Section>

          {/* ── Leaderboard ── */}
          {friends.length > 0 && (
            <Section label="Friend leaderboard">
              <div className="border border-border-soft overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-soft" style={{ background: "#0d1210" }}>
                      {["#", "Player", "Games", "Win %"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left f-mono text-[10px] uppercase text-muted" style={{ letterSpacing: "0.18em" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardEntries.map((entry, i) => (
                      <tr
                        key={entry.userId}
                        className="border-b border-border-soft last:border-0"
                        style={{ background: entry.isSelf ? "#0f1a12" : "#0a0e0c" }}
                      >
                        <td className="px-3 py-3 f-display font-black text-muted text-sm">{i + 1}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={dn(entry.email, entry.displayName)} color={entry.avatarColor} size="sm" />
                            <span className="f-display font-black text-cream text-base">
                              {dn(entry.email, entry.displayName)}
                              {entry.isSelf && <span className="text-electric text-xs ml-1.5">you</span>}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 f-mono text-sm text-bone">{entry.gamesPlayed ?? "—"}</td>
                        <td className="px-3 py-3 f-display font-black text-base"
                          style={{ color: (entry.winRate ?? 0) >= 50 ? "#d4ff3a" : "#f2e8d0" }}>
                          {entry.winRate !== undefined ? `${entry.winRate}%` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-px w-6 bg-border" />
        <span className="f-mono text-xs uppercase text-muted" style={{ letterSpacing: "0.25em" }}>
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

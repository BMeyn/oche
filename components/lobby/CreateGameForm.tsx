"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, X } from "lucide-react";
import type { GameConfig, GameMode, InRule, OutRule } from "@/lib/types";
import { Label } from "@/components/ui/primitives";

interface Props {
  onClose: () => void;
}

export function CreateGameForm({ onClose }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<GameMode>("x01");
  const [startingScore, setStartingScore] = useState(501);
  const [outRule, setOutRule] = useState<OutRule>("double");
  const [inRule, setInRule] = useState<InRule>("straight");
  const [legsToWin, setLegsToWin] = useState(3);
  const [opponentMode, setOpponentMode] = useState<"invite" | "local">("invite");
  const [guestName, setGuestName] = useState("");
  const [loading, setLoading] = useState(false);

  const canCreate = opponentMode === "invite" || guestName.trim().length > 0;

  const create = async () => {
    if (!canCreate) return;
    setLoading(true);
    const config: GameConfig = {
      mode,
      startingScore: mode === "x01" ? startingScore : 0,
      legsToWin,
      inRule: mode === "x01" ? inRule : undefined,
      outRule: mode === "x01" ? outRule : undefined,
    };
    const body = opponentMode === "local"
      ? { ...config, guestName: guestName.trim() }
      : config;
    const res = await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const game = await res.json();
      router.push(`/match/${game.id}`);
    } else {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "#0a0e0ce8" }}
    >
      <div
        className="w-full max-w-2xl border border-border bg-surface overflow-y-auto"
        style={{ maxHeight: "90vh" }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-soft">
          <div
            className="f-mono text-xs uppercase text-electric"
            style={{ letterSpacing: "0.25em" }}
          >
            Create game
          </div>
          <button onClick={onClose} className="text-muted hover:text-cream">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          <div>
            <Label>Game mode</Label>
            <div className="grid grid-cols-2 gap-2">
              <ModeCard
                active={mode === "x01"}
                onClick={() => setMode("x01")}
                title="X01"
                subtitle="Race to zero"
                description="The classic. 301/501/701/1001 with full rule control."
              />
              <ModeCard
                active={mode === "highlow"}
                onClick={() => setMode("highlow")}
                title="High-Low"
                subtitle="Highest 3-dart turn"
                description="Each leg, both throw 3 darts. Higher total wins."
              />
            </div>
          </div>

          {mode === "x01" && (
            <>
              <div>
                <Label>Starting score</Label>
                <div className="grid grid-cols-4 gap-2">
                  {[301, 501, 701, 1001].map((n) => (
                    <OptionButton
                      key={n}
                      active={startingScore === n}
                      onClick={() => setStartingScore(n)}
                    >
                      <div className="f-display font-black text-2xl">{n}</div>
                    </OptionButton>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <Label>In rule</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <RuleButton active={inRule === "straight"} onClick={() => setInRule("straight")} title="Straight" hint="Any dart starts" />
                    <RuleButton active={inRule === "double"} onClick={() => setInRule("double")} title="Double in" hint="Must hit a double to start" />
                  </div>
                </div>
                <div>
                  <Label>Out rule</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <RuleButton active={outRule === "straight"} onClick={() => setOutRule("straight")} title="Straight" hint="Any dart finishes" />
                    <RuleButton active={outRule === "double"} onClick={() => setOutRule("double")} title="Double" hint="Must finish on a double" />
                    <RuleButton active={outRule === "master"} onClick={() => setOutRule("master")} title="Master" hint="Double or triple finishes" />
                  </div>
                </div>
              </div>
            </>
          )}

          <div>
            <Label>Format · first to legs</Label>
            <div className="grid grid-cols-5 gap-2">
              {[1, 3, 5, 7, 9].map((n) => (
                <OptionButton key={n} active={legsToWin === n} onClick={() => setLegsToWin(n)}>
                  <div className="f-display font-black text-2xl">{n}</div>
                  <div className="f-mono text-[9px] uppercase" style={{ letterSpacing: "0.2em" }}>
                    {n === 1 ? "leg" : "legs"}
                  </div>
                </OptionButton>
              ))}
            </div>
          </div>

          <div>
            <Label>Opponent</Label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <RuleButton
                active={opponentMode === "invite"}
                onClick={() => setOpponentMode("invite")}
                title="Invite"
                hint="Share a link with your opponent"
              />
              <RuleButton
                active={opponentMode === "local"}
                onClick={() => setOpponentMode("local")}
                title="Play locally"
                hint="Both players on this device"
              />
            </div>
            {opponentMode === "local" && (
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Opponent name"
                maxLength={24}
                className="w-full border px-4 py-2.5 f-mono text-sm text-cream bg-ink outline-none"
                style={{ borderColor: guestName.trim() ? "#d4ff3a" : "#2a332d" }}
                autoFocus
              />
            )}
          </div>
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={create}
            disabled={loading || !canCreate}
            className="w-full f-display font-black text-2xl uppercase py-4 flex items-center justify-center gap-3"
            style={{
              background: loading || !canCreate ? "#454b47" : "#d4ff3a",
              color: loading || !canCreate ? "#6d736f" : "#0a0e0c",
              cursor: loading || !canCreate ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Creating…" : <>Create game <ArrowRight className="w-6 h-6" strokeWidth={3} /></>}
          </button>
        </div>
      </div>
    </div>
  );
}

function OptionButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="border p-2.5 flex flex-col items-center justify-center"
      style={{
        background: active ? "#d4ff3a" : "#141a17",
        color: active ? "#0a0e0c" : "#f2e8d0",
        borderColor: active ? "#d4ff3a" : "#2a332d",
      }}
    >
      {children}
    </button>
  );
}

function ModeCard({ active, onClick, title, subtitle, description }: {
  active: boolean; onClick: () => void; title: string; subtitle: string; description: string;
}) {
  return (
    <button
      onClick={onClick}
      className="border p-4 text-left"
      style={{
        background: active ? "#1c2420" : "#141a17",
        borderColor: active ? "#d4ff3a" : "#2a332d",
        boxShadow: active ? "0 0 0 1px #d4ff3a, 0 0 24px -8px #d4ff3a88" : "none",
      }}
    >
      <div className="flex items-baseline justify-between mb-1">
        <span className="f-display font-black text-2xl" style={{ color: active ? "#d4ff3a" : "#f2e8d0" }}>{title}</span>
        <span className="f-mono text-[10px] uppercase text-muted" style={{ letterSpacing: "0.2em" }}>{subtitle}</span>
      </div>
      <div className="f-mono text-xs text-bone leading-[1.4]">{description}</div>
    </button>
  );
}

function RuleButton({ active, onClick, title, hint }: { active: boolean; onClick: () => void; title: string; hint: string }) {
  return (
    <button
      onClick={onClick}
      className="border p-2.5 text-left"
      style={{
        background: active ? "#1c2420" : "#141a17",
        borderColor: active ? "#d4ff3a" : "#2a332d",
      }}
    >
      <div className="f-display font-black text-base" style={{ color: active ? "#d4ff3a" : "#f2e8d0" }}>{title}</div>
      <div className="f-mono text-[9px] mt-0.5 text-muted" style={{ letterSpacing: "0.1em" }}>{hint}</div>
    </button>
  );
}

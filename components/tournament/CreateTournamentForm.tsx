"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, X } from "lucide-react";
import type { GameConfig, GameMode, InRule, OutRule } from "@/lib/types";
import { Label } from "@/components/ui/primitives";

interface Props {
  onClose: () => void;
}

export function CreateTournamentForm({ onClose }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [format, setFormat] = useState<"single_elim" | "round_robin">("single_elim");
  const [seasonHalves, setSeasonHalves] = useState<1 | 2>(1);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [mode, setMode] = useState<GameMode>("x01");
  const [startingScore, setStartingScore] = useState(501);
  const [outRule, setOutRule] = useState<OutRule>("double");
  const [inRule, setInRule] = useState<InRule>("straight");
  const [legsToWin, setLegsToWin] = useState(1);
  const [loading, setLoading] = useState(false);

  const canCreate = name.trim().length > 0;

  const create = async () => {
    if (!canCreate) return;
    setLoading(true);
    const gameConfig: GameConfig = {
      mode,
      startingScore: mode === "x01" ? startingScore : 0,
      legsToWin,
      inRule: mode === "x01" ? inRule : undefined,
      outRule: mode === "x01" ? outRule : undefined,
    };
    const res = await fetch("/api/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), format, maxPlayers, seasonHalves, ...gameConfig }),
    });
    if (res.ok) {
      const tournament = await res.json();
      router.push(`/tournament/${tournament.id}`);
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
            Create tournament
          </div>
          <button onClick={onClose} className="text-muted hover:text-cream">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Tournament name */}
          <div>
            <Label>Tournament name</Label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Friday Night Darts"
              maxLength={48}
              className="w-full border px-4 py-2.5 f-mono text-sm text-cream bg-ink outline-none"
              style={{ borderColor: name.trim() ? "#d4ff3a" : "#2a332d" }}
              autoFocus
            />
          </div>

          {/* Format */}
          <div>
            <Label>Format</Label>
            <div className="grid grid-cols-2 gap-2">
              <ModeCard
                active={format === "single_elim"}
                onClick={() => setFormat("single_elim")}
                title="Single elim"
                subtitle="Knockout bracket"
                description="Lose once and you're out. Bracket advances until one champion remains."
              />
              <ModeCard
                active={format === "round_robin"}
                onClick={() => setFormat("round_robin")}
                title="Round robin"
                subtitle="Everyone plays all"
                description="Every player faces every other player. Most wins takes the trophy."
              />
            </div>
          </div>

          {/* Season halves (round-robin only) */}
          {format === "round_robin" && (
            <div>
              <Label>Season</Label>
              <div className="grid grid-cols-2 gap-2">
                <ModeCard
                  active={seasonHalves === 1}
                  onClick={() => setSeasonHalves(1)}
                  title="Single"
                  subtitle="One half"
                  description="Each pair plays once. Most wins takes the trophy."
                />
                <ModeCard
                  active={seasonHalves === 2}
                  onClick={() => setSeasonHalves(2)}
                  title="Full season"
                  subtitle="Home & away"
                  description="Each pair plays twice — once as home, once as away."
                />
              </div>
            </div>
          )}

          {/* Max players */}
          <div>
            <Label>Max players</Label>
            <div className="grid grid-cols-5 gap-2">
              {[4, 6, 8, 12, 16].map((n) => (
                <OptionButton
                  key={n}
                  active={maxPlayers === n}
                  onClick={() => setMaxPlayers(n)}
                >
                  <div className="f-display font-black text-2xl">{n}</div>
                </OptionButton>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border-soft" />

          {/* Game mode */}
          <div>
            <Label>Game mode (per match)</Label>
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
            {loading ? "Creating…" : <>Create tournament <ArrowRight className="w-6 h-6" strokeWidth={3} /></>}
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

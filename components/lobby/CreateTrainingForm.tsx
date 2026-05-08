"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, X } from "lucide-react";
import type { GameConfig, TrainingDrill } from "@/lib/types";
import { Label } from "@/components/ui/primitives";

interface Props {
  onClose: () => void;
}

export function CreateTrainingForm({ onClose }: Props) {
  const router = useRouter();
  const [drill, setDrill] = useState<TrainingDrill>("doubles");
  const [scenarioCount, setScenarioCount] = useState(10);
  const [loading, setLoading] = useState(false);

  const create = async () => {
    setLoading(true);
    const config: GameConfig = {
      mode: "training",
      startingScore: 0,
      legsToWin: 1,
      drill,
      scenarioCount: drill === "checkout" ? scenarioCount : undefined,
    };
    const res = await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
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
            Practice · solo drill
          </div>
          <button onClick={onClose} className="text-muted hover:text-cream">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          <div>
            <Label>Drill</Label>
            <div className="grid grid-cols-1 gap-2">
              <DrillCard
                active={drill === "doubles"}
                onClick={() => setDrill("doubles")}
                title="Doubles Practice"
                subtitle="D1 → BULL"
                description="Three darts at each double from D1 to D20, then BULL. Track your hit rate and longest streak."
              />
              <DrillCard
                active={drill === "bobs27"}
                onClick={() => setDrill("bobs27")}
                title="Bobs 27"
                subtitle="The classic"
                description="Start at 27. Each round target a double D1→D20. Hit = +2×n, miss the round = −2×n. Bust at 0, finish at D20."
              />
              <DrillCard
                active={drill === "checkout"}
                onClick={() => setDrill("checkout")}
                title="Checkout Practice"
                subtitle="Random finishes"
                description="Random checkout from 41–170. Three darts to finish on a double. Tracks success rate and best finish."
              />
            </div>
          </div>

          {drill === "checkout" && (
            <div>
              <Label>Scenarios</Label>
              <div className="grid grid-cols-3 gap-2">
                {[5, 10, 20].map((n) => (
                  <OptionButton
                    key={n}
                    active={scenarioCount === n}
                    onClick={() => setScenarioCount(n)}
                  >
                    <div className="f-display font-black text-2xl">{n}</div>
                    <div className="f-mono text-[9px] uppercase" style={{ letterSpacing: "0.2em" }}>
                      checkouts
                    </div>
                  </OptionButton>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={create}
            disabled={loading}
            className="w-full f-display font-black text-2xl uppercase py-4 flex items-center justify-center gap-3"
            style={{
              background: loading ? "#454b47" : "#d4ff3a",
              color: loading ? "#6d736f" : "#0a0e0c",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Starting…" : <>Start drill <ArrowRight className="w-6 h-6" strokeWidth={3} /></>}
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

function DrillCard({ active, onClick, title, subtitle, description }: {
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

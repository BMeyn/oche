"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { MatchConfig, GameMode, InRule, OutRule } from "@/lib/types";
import { BrandMark, Label, Tag } from "@/components/ui/primitives";

interface Props {
  onStart: (config: MatchConfig) => void;
}

export function SetupScreen({ onStart }: Props) {
  const [p1, setP1] = useState("Player 1");
  const [p2, setP2] = useState("Player 2");
  const [legsToWin, setLegsToWin] = useState(3);
  const [mode, setMode] = useState<GameMode>("x01");
  const [startingScore, setStartingScore] = useState(501);
  const [outRule, setOutRule] = useState<OutRule>("double");
  const [inRule, setInRule] = useState<InRule>("straight");

  const canStart = !!p1.trim() && !!p2.trim() && p1.trim() !== p2.trim();

  const start = () => {
    onStart({
      players: [p1.trim(), p2.trim()],
      legsToWin,
      mode,
      startingScore,
      inRule: mode === "x01" ? inRule : undefined,
      outRule: mode === "x01" ? outRule : undefined,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-ink">
      <div className="flex items-center justify-between px-6 py-5 border-b border-border-soft">
        <BrandMark />
        <Tag color="#6d736f">V1 · OFFLINE</Tag>
      </div>
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-3xl rise">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px w-10 bg-oche-red" />
            <span
              className="f-mono text-xs uppercase text-oche-red"
              style={{ letterSpacing: "0.25em" }}
            >
              new match
            </span>
          </div>
          <h1
            className="f-display font-black leading-[0.9] mb-8 text-cream"
            style={{ fontSize: "clamp(40px, 7vw, 84px)" }}
          >
            STEP TO<br />THE <span className="text-electric">OCHE.</span>
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-7">
            <PlayerInput label="Player 1" value={p1} onChange={setP1} accent="#d4ff3a" />
            <PlayerInput label="Player 2" value={p2} onChange={setP2} accent="#e63946" />
          </div>

          <div className="mb-6">
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
              <div className="mb-6">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-7">
                <div>
                  <Label>In rule</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <RuleButton
                      active={inRule === "straight"}
                      onClick={() => setInRule("straight")}
                      title="Straight"
                      hint="Any dart starts"
                    />
                    <RuleButton
                      active={inRule === "double"}
                      onClick={() => setInRule("double")}
                      title="Double in"
                      hint="Must hit a double to start"
                    />
                  </div>
                </div>
                <div>
                  <Label>Out rule</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <RuleButton
                      active={outRule === "straight"}
                      onClick={() => setOutRule("straight")}
                      title="Straight"
                      hint="Any dart finishes"
                    />
                    <RuleButton
                      active={outRule === "double"}
                      onClick={() => setOutRule("double")}
                      title="Double"
                      hint="Must finish on a double"
                    />
                    <RuleButton
                      active={outRule === "master"}
                      onClick={() => setOutRule("master")}
                      title="Master"
                      hint="Double or triple finishes"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="mb-8">
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

          <button
            disabled={!canStart}
            onClick={start}
            className="w-full f-display font-black text-3xl uppercase py-5 flex items-center justify-center gap-3"
            style={{
              background: canStart ? "#d4ff3a" : "#454b47",
              color: canStart ? "#0a0e0c" : "#6d736f",
              cursor: canStart ? "pointer" : "not-allowed",
            }}
          >
            Game on <ArrowRight className="w-7 h-7" strokeWidth={3} />
          </button>
          {!canStart && (
            <p className="mt-3 f-mono text-xs text-center text-muted">
              Enter two different names.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function PlayerInput({
  label, value, onChange, accent,
}: { label: string; value: string; onChange: (v: string) => void; accent: string }) {
  return (
    <div className="border border-border bg-surface p-3 relative">
      <div
        className="absolute top-0 left-0 h-0.5 w-8"
        style={{ background: accent }}
      />
      <Label>{label}</Label>
      <input
        type="text"
        value={value}
        maxLength={20}
        onChange={(e) => onChange(e.target.value)}
        className="w-full f-display font-black text-2xl bg-transparent text-cream"
      />
    </div>
  );
}

function OptionButton({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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

function ModeCard({
  active, onClick, title, subtitle, description,
}: {
  active: boolean; onClick: () => void;
  title: string; subtitle: string; description: string;
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
        <span
          className="f-display font-black text-2xl"
          style={{ color: active ? "#d4ff3a" : "#f2e8d0" }}
        >
          {title}
        </span>
        <span
          className="f-mono text-[10px] uppercase text-muted"
          style={{ letterSpacing: "0.2em" }}
        >
          {subtitle}
        </span>
      </div>
      <div className="f-mono text-xs text-bone leading-[1.4]">{description}</div>
    </button>
  );
}

function RuleButton({
  active, onClick, title, hint,
}: { active: boolean; onClick: () => void; title: string; hint: string }) {
  return (
    <button
      onClick={onClick}
      className="border p-2.5 text-left text-cream"
      style={{
        background: active ? "#1c2420" : "#141a17",
        borderColor: active ? "#d4ff3a" : "#2a332d",
      }}
    >
      <div
        className="f-display font-black text-base"
        style={{ color: active ? "#d4ff3a" : "#f2e8d0" }}
      >
        {title}
      </div>
      <div
        className="f-mono text-[9px] mt-0.5 text-muted"
        style={{ letterSpacing: "0.1em" }}
      >
        {hint}
      </div>
    </button>
  );
}

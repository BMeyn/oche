"use client";

import { useState } from "react";

const ERRORS: Record<string, string> = {
  expired: "That link has expired or was already used. Request a new one.",
  invalid: "Invalid login link. Request a new one.",
};

const FEATURES = [
  {
    label: "Tournaments",
    title: "Bracket play",
    color: "#d4ff3a",
    body: "Run single-elimination brackets or round-robin leagues. Seed players, track every match and crown a champion — all in one place.",
  },
  {
    label: "Live Stats",
    title: "Real-time averages",
    color: "#d4ff3a",
    body: "3-dart averages update after every turn. Full match history, per-leg breakdowns and checkout percentages — so the numbers always tell the truth.",
  },
  {
    label: "Friend Challenges",
    title: "Play your crew",
    color: "#d4ff3a",
    body: "Add friends by email, send instant match invites and track your head-to-head record. A shared leaderboard keeps the rivalry alive.",
  },
] as const;

const MODES = [
  "X01", "301", "501", "701", "1001",
  "High-Low", "Double out", "Master out", "Double in", "Checkout hints",
] as const;

const STEPS = [
  {
    num: "01",
    title: "Create a game",
    body: "Pick your mode, configure the rules and set the max player count. Done in seconds.",
  },
  {
    num: "02",
    title: "Invite friends",
    body: "Share a link or add friends directly from your friends list. They join with one tap.",
  },
  {
    num: "03",
    title: "Throw your darts",
    body: "Tap each dart on screen. OCHE handles bust detection, checkout hints and all the maths.",
  },
] as const;

interface EmailCTAProps {
  email: string;
  setEmail: (v: string) => void;
  state: "idle" | "loading" | "sent" | "error";
  handleSubmit: (e: React.FormEvent) => void;
  serverError: string;
  error?: string;
  dark?: boolean;
}

function EmailCTA({ email, setEmail, state, handleSubmit, serverError, error, dark }: EmailCTAProps) {
  const bg = dark ? "#0a0e0c" : "#141a17";
  if (state === "sent") {
    return (
      <div className="space-y-1">
        <p className="f-display font-black text-xl uppercase text-cream">Check your inbox</p>
        <p className="f-mono text-xs text-muted">
          Login link sent to <span className="text-electric">{email}</span> — expires in 15 min.
        </p>
        <button
          onClick={() => {}}
          className="f-mono text-xs text-muted underline underline-offset-2 hover:text-cream pt-1"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {(error || serverError) && (
        <p className="f-mono text-xs text-oche-red">
          {serverError || ERRORS[error!] || "Something went wrong."}
        </p>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={state === "loading"}
          className="flex-1 px-4 py-3 f-mono text-sm text-cream placeholder-muted outline-none border border-border-soft focus:border-electric"
          style={{ background: bg, caretColor: "#d4ff3a", minWidth: 0 }}
        />
        <button
          type="submit"
          disabled={state === "loading" || !email}
          className="px-6 py-3 f-display font-black text-sm uppercase tracking-wider shrink-0 disabled:opacity-40"
          style={{ background: "#d4ff3a", color: "#0a0e0c" }}
        >
          {state === "loading" ? "Sending…" : "Send login link →"}
        </button>
      </form>
      <p className="f-mono text-[11px] text-muted" style={{ letterSpacing: "0.05em" }}>
        Free · No password needed · Works on phone, tablet and desktop
      </p>
    </div>
  );
}

export function LandingPage({ error }: { error?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [serverError, setServerError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setServerError("");
    try {
      const res = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setState("sent");
      } else {
        const data = await res.json();
        setServerError(data.error ?? "Something went wrong");
        setState("error");
      }
    } catch {
      setServerError("Network error — please try again");
      setState("error");
    }
  }

  const ctaProps: EmailCTAProps = { email, setEmail, state, handleSubmit, serverError, error };

  return (
    <div className="min-h-screen bg-ink flex flex-col">
      {/* Nav */}
      <header className="px-6 sm:px-12 py-5 border-b border-border-soft flex items-center justify-between">
        <span
          className="f-display font-black uppercase text-electric"
          style={{ fontSize: "clamp(20px, 3vw, 26px)", letterSpacing: "-0.02em" }}
        >
          OCHE
        </span>
        <span className="f-serif italic text-muted text-sm hidden sm:block">
          Three darts. Zero math.
        </span>
      </header>

      <main>
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section
          aria-label="hero"
          className="px-6 sm:px-12 pt-16 pb-20 border-b border-border-soft"
        >
          <div className="rise max-w-4xl">
            <h1
              className="f-display font-black leading-[0.86] mb-6"
              style={{ fontSize: "clamp(52px, 9vw, 130px)" }}
            >
              <span className="text-cream">THE DARTS SCORER</span>
              <br />
              <span className="text-cream">THAT </span>
              <span style={{ color: "#d4ff3a" }}>NEVER MISSES.</span>
            </h1>

            <p
              className="f-mono text-bone mb-8 max-w-xl"
              style={{ fontSize: "clamp(13px, 1.5vw, 16px)", lineHeight: "1.75" }}
            >
              Step up to the oche, tap your darts, walk away with the stats.
              OCHE handles bust detection, checkout hints and live averages —
              so you can focus on throwing.
            </p>

            <EmailCTA {...ctaProps} dark />
          </div>
        </section>

        {/* ── Feature cards ─────────────────────────────────────────────────── */}
        <section
          aria-label="features"
          className="px-6 sm:px-12 py-16 border-b border-border-soft"
        >
          <div
            className="f-mono text-[10px] uppercase text-muted mb-8"
            style={{ letterSpacing: "0.25em" }}
          >
            Everything you need
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <article
                key={f.label}
                className="p-6 border border-border-soft bg-surface"
                style={{ borderTop: `2px solid ${f.color}` }}
              >
                <span
                  className="f-mono text-[10px] uppercase mb-3 inline-block"
                  style={{ color: f.color, letterSpacing: "0.25em" }}
                >
                  {f.label}
                </span>
                <h2 className="f-display font-black text-2xl uppercase text-cream mb-3">
                  {f.title}
                </h2>
                <p className="f-mono text-sm text-bone" style={{ lineHeight: "1.7" }}>
                  {f.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* ── Game modes strip ──────────────────────────────────────────────── */}
        <section
          aria-label="game modes"
          className="px-6 sm:px-12 py-10 border-b border-border-soft"
        >
          <div
            className="f-mono text-[10px] uppercase text-muted mb-5"
            style={{ letterSpacing: "0.25em" }}
          >
            Game modes
          </div>
          <div className="flex flex-wrap gap-2">
            {MODES.map((mode) => (
              <span
                key={mode}
                className="f-mono text-xs px-3 py-1.5 border border-border-soft text-bone"
                style={{ background: "#141a17", letterSpacing: "0.08em" }}
              >
                {mode}
              </span>
            ))}
          </div>
        </section>

        {/* ── How it works ──────────────────────────────────────────────────── */}
        <section
          aria-label="how it works"
          className="px-6 sm:px-12 py-16 border-b border-border-soft"
        >
          <div
            className="f-mono text-[10px] uppercase text-muted mb-8"
            style={{ letterSpacing: "0.25em" }}
          >
            How it works
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div key={s.num}>
                <div
                  className="f-display font-black mb-3"
                  style={{ fontSize: "clamp(40px, 5vw, 64px)", color: "#d4ff3a" }}
                >
                  {s.num}
                </div>
                <h3 className="f-display font-black text-xl uppercase text-cream mb-2">
                  {s.title}
                </h3>
                <p className="f-mono text-sm text-bone" style={{ lineHeight: "1.7" }}>
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Bottom CTA ────────────────────────────────────────────────────── */}
        <section
          aria-label="sign in"
          className="px-6 sm:px-12 py-20 border-b border-border-soft"
        >
          <div className="bang max-w-3xl">
            <h2
              className="f-display font-black leading-[0.86] mb-8 text-cream"
              style={{ fontSize: "clamp(44px, 7vw, 100px)" }}
            >
              STEP UP TO<br />
              THE <span style={{ color: "#d4ff3a" }}>OCHE.</span>
            </h2>
            <EmailCTA {...ctaProps} />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-6 sm:px-12 py-5 flex items-center justify-between">
        <span
          className="f-display font-black uppercase text-electric"
          style={{ fontSize: "18px", letterSpacing: "-0.02em" }}
        >
          OCHE
        </span>
        <span className="f-serif italic text-xs text-muted">"Three darts. Zero math."</span>
        <span
          className="f-mono text-[10px] text-muted hidden sm:block"
          style={{ letterSpacing: "0.15em" }}
        >
          oche.cloud
        </span>
      </footer>
    </div>
  );
}

"use client";

import { useState } from "react";

const ERRORS: Record<string, string> = {
  expired: "That link has expired or was already used. Request a new one.",
  invalid: "Invalid login link. Request a new one.",
};

export function LoginForm({ error }: { error?: string }) {
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

  return (
    <div className="w-full max-w-sm">
      {/* Brand */}
      <div className="text-center mb-8">
        <div
          className="font-display text-6xl font-black tracking-tighter uppercase"
          style={{ color: "#d4ff3a" }}
        >
          OCHE
        </div>
        <div className="font-serif italic text-muted text-sm mt-1">
          Three darts. Zero math.
        </div>
      </div>

      {/* Card */}
      <div className="bg-surface border border-border rounded-lg p-8">
        {state === "sent" ? (
          <div className="text-center">
            <div className="text-4xl mb-4">✉️</div>
            <p className="text-cream font-display text-xl font-bold uppercase tracking-wide mb-2">
              Check your inbox
            </p>
            <p className="text-muted text-sm">
              We sent a login link to{" "}
              <span className="text-cream">{email}</span>.
              <br />
              It expires in 15 minutes.
            </p>
            <button
              onClick={() => { setState("idle"); setEmail(""); }}
              className="mt-6 text-xs text-muted underline underline-offset-2"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <p className="text-cream text-sm mb-6">
              Enter your email to receive a one-time login link.
            </p>

            {(error || serverError) && (
              <p className="text-oche-red text-sm mb-4">
                {serverError || ERRORS[error!] || "Something went wrong."}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface2 border border-border rounded-md px-4 py-3 text-cream placeholder-muted font-mono text-sm focus:outline-none focus:border-electric"
                style={{ caretColor: "#d4ff3a" }}
                disabled={state === "loading"}
              />
              <button
                type="submit"
                disabled={state === "loading" || !email}
                className="w-full py-3 rounded-md font-display font-bold uppercase tracking-wider text-sm transition-opacity disabled:opacity-40"
                style={{ background: "#d4ff3a", color: "#0a0e0c" }}
              >
                {state === "loading" ? "Sending…" : "Send login link"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

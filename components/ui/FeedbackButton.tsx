"use client";

import { useState } from "react";
import { X } from "lucide-react";

type FeedbackType = "bug" | "feature";

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!message.trim()) return;
    setSending(true);
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, message }),
    });
    setSending(false);
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setOpen(false);
      setMessage("");
      setType("bug");
    }, 2000);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-40 f-mono text-[10px] uppercase text-muted hover:text-cream border border-border-soft px-3 py-2"
        style={{ background: "#141a17", letterSpacing: "0.15em" }}
      >
        Feedback
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-start p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="border border-border-soft p-5 w-full max-w-sm"
            style={{ background: "#141a17" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span
                className="f-mono text-[10px] uppercase text-muted"
                style={{ letterSpacing: "0.2em" }}
              >
                Send feedback
              </span>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-cream">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              {(["bug", "feature"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className="f-mono text-[10px] uppercase px-3 py-1.5"
                  style={{
                    background: type === t ? "#d4ff3a" : "transparent",
                    color: type === t ? "#0a0e0c" : "#6d736f",
                    border: `1px solid ${type === t ? "#d4ff3a" : "#2a332d"}`,
                    letterSpacing: "0.15em",
                  }}
                >
                  {t === "bug" ? "Bug report" : "Feature request"}
                </button>
              ))}
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe the issue or idea…"
              rows={4}
              className="w-full f-mono text-sm text-bone bg-transparent border border-border-soft px-3 py-2 resize-none outline-none placeholder:text-muted focus:border-electric"
            />

            <button
              onClick={submit}
              disabled={sending || sent || !message.trim()}
              className="mt-3 w-full f-mono text-xs uppercase py-2.5"
              style={{
                background: sent ? "#1c3820" : !message.trim() || sending ? "#454b47" : "#d4ff3a",
                color: sent ? "#d4ff3a" : !message.trim() || sending ? "#6d736f" : "#0a0e0c",
                letterSpacing: "0.2em",
                cursor: sending || sent || !message.trim() ? "not-allowed" : "pointer",
              }}
            >
              {sent ? "Sent!" : sending ? "Sending…" : "Send →"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

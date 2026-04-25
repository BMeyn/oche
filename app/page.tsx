"use client";

import { useState } from "react";
import type { Match, MatchConfig } from "@/lib/types";
import { createMatch } from "@/lib/scoring";
import { SetupScreen } from "@/components/setup/SetupScreen";
import { MatchScreen } from "@/components/match/MatchScreen";
import { SummaryScreen } from "@/components/summary/SummaryScreen";

type View = "setup" | "match" | "summary";

export default function HomePage() {
  const [view, setView] = useState<View>("setup");
  const [match, setMatch] = useState<Match | null>(null);

  const handleStart = (config: MatchConfig) => {
    setMatch(createMatch(config));
    setView("match");
  };
  const handleFinish = (final: Match) => {
    setMatch(final);
    setView("summary");
  };
  const handleRestart = () => {
    if (match) {
      setMatch(createMatch(match.config));
      setView("match");
    }
  };
  const handleNew = () => {
    setMatch(null);
    setView("setup");
  };
  const handleExit = () => {
    if (typeof window !== "undefined" &&
        window.confirm("Exit the match? Progress will be lost.")) {
      setMatch(null);
      setView("setup");
    }
  };

  if (view === "setup") return <SetupScreen onStart={handleStart} />;
  if (view === "match" && match)
    return (
      <MatchScreen
        match={match}
        setMatch={setMatch}
        onFinish={handleFinish}
        onExit={handleExit}
      />
    );
  if (view === "summary" && match)
    return (
      <SummaryScreen
        match={match}
        onRestart={handleRestart}
        onNewMatch={handleNew}
      />
    );
  return null;
}

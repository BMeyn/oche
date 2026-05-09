"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/Avatar";
import { displayName as dn } from "@/lib/display";
import type { LeaderboardEntry } from "@/lib/db/leaderboard";

type SortKey = "winRate" | "threeDartAvg" | "ton80s" | "bestFinish" | "gamesPlayed";

interface Props {
  entries: LeaderboardEntry[];
  viewerId: number;
}

const RANKED_MIN_GAMES = 3;

const SORT_BUTTONS: Array<{ key: SortKey; label: string }> = [
  { key: "winRate", label: "Win %" },
  { key: "threeDartAvg", label: "3-Dart Avg" },
  { key: "ton80s", label: "180s" },
  { key: "bestFinish", label: "Best Finish" },
  { key: "gamesPlayed", label: "Games" },
];

function sortValue(e: LeaderboardEntry, key: SortKey): number {
  switch (key) {
    case "winRate": return e.winRate;
    case "threeDartAvg": return e.threeDartAvg;
    case "ton80s": return e.total180s;
    case "bestFinish": return e.bestFinish;
    case "gamesPlayed": return e.gamesPlayed;
  }
}

export function LeaderboardPage({ entries, viewerId }: Props) {
  const router = useRouter();
  const [sortBy, setSortBy] = useState<SortKey>("winRate");

  const [ranked, rising] = useMemo(() => {
    const r: LeaderboardEntry[] = [];
    const ri: LeaderboardEntry[] = [];
    for (const e of entries) {
      if (e.gamesPlayed >= RANKED_MIN_GAMES) r.push(e);
      else ri.push(e);
    }
    return [r, ri];
  }, [entries]);

  const sortedRanked = useMemo(() => {
    return [...ranked].sort((a, b) => {
      const diff = sortValue(b, sortBy) - sortValue(a, sortBy);
      if (diff !== 0) return diff;
      // Stable secondary sort by gamesPlayed desc
      return b.gamesPlayed - a.gamesPlayed;
    });
  }, [ranked, sortBy]);

  const sortedRising = useMemo(() => {
    return [...rising].sort((a, b) => {
      const diff = b.gamesPlayed - a.gamesPlayed;
      if (diff !== 0) return diff;
      return b.winRate - a.winRate;
    });
  }, [rising]);

  const playerCount = entries.length;
  // Each game contributes to two players, so /2
  const gamesLogged = Math.round(entries.reduce((s, e) => s + e.gamesPlayed, 0) / 2);
  const highestAvg = entries.reduce((m, e) => (e.threeDartAvg > m ? e.threeDartAvg : m), 0);

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

      {/* Content */}
      <div className="flex-1 px-6 py-10 max-w-3xl w-full mx-auto">
        <div className="rise">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-10 bg-oche-red" />
            <span
              className="f-mono text-xs uppercase text-oche-red"
              style={{ letterSpacing: "0.25em" }}
            >
              leaderboard
            </span>
          </div>

          <h1
            className="f-display font-black leading-[0.9] mb-2 text-cream"
            style={{ fontSize: "clamp(36px, 6vw, 72px)" }}
          >
            THE <span className="text-electric">OCHE</span><br />TABLE.
          </h1>
          <div className="f-serif italic text-bone text-lg mb-8">
            "the table doesn't lie."
          </div>

          {playerCount === 0 ? (
            <div className="border border-border-soft px-5 py-8 text-center" style={{ background: "#0d1210" }}>
              <div className="f-serif italic text-bone text-base mb-2">"no games on the books yet."</div>
              <button
                onClick={() => router.push("/lobby")}
                className="f-mono text-xs uppercase text-electric hover:underline"
                style={{ letterSpacing: "0.18em" }}
              >
                Back to lobby
              </button>
            </div>
          ) : (
            <>
              {/* Aggregate stats */}
              <div className="grid grid-cols-3 gap-2 mb-8">
                <StatBox label="Players" value={String(playerCount)} />
                <StatBox label="Games logged" value={String(gamesLogged)} />
                <StatBox
                  label="Top 3-dart avg"
                  value={highestAvg > 0 ? highestAvg.toFixed(2) : "—"}
                  highlight={highestAvg > 0}
                />
              </div>

              {/* Sort buttons */}
              <div className="mb-4">
                <div className="f-mono text-[10px] uppercase text-muted mb-2" style={{ letterSpacing: "0.2em" }}>
                  Sort by
                </div>
                <div className="flex flex-wrap gap-2">
                  {SORT_BUTTONS.map((b) => {
                    const active = sortBy === b.key;
                    return (
                      <button
                        key={b.key}
                        onClick={() => setSortBy(b.key)}
                        className="f-mono text-[11px] uppercase px-3 py-1.5 transition-colors"
                        style={{
                          letterSpacing: "0.18em",
                          background: active ? "#d4ff3a" : "transparent",
                          color: active ? "#0a0e0c" : "#a5b3aa",
                          border: active ? "1px solid #d4ff3a" : "1px solid #1f2925",
                        }}
                      >
                        {b.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ranked section */}
              <Section label="Ranked" count={sortedRanked.length}>
                {sortedRanked.length === 0 ? (
                  <EmptyState text={`No players with ${RANKED_MIN_GAMES}+ ranked games yet.`} />
                ) : (
                  <LeaderboardTable
                    entries={sortedRanked}
                    sortBy={sortBy}
                    viewerId={viewerId}
                    showRank
                  />
                )}
              </Section>

              {/* Rising section */}
              {sortedRising.length > 0 && (
                <Section
                  label={`Rising — fewer than ${RANKED_MIN_GAMES} ranked games`}
                  count={sortedRising.length}
                >
                  <LeaderboardTable
                    entries={sortedRising}
                    sortBy={sortBy}
                    viewerId={viewerId}
                    showRank={false}
                  />
                </Section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function LeaderboardTable({
  entries,
  sortBy,
  viewerId,
  showRank,
}: {
  entries: LeaderboardEntry[];
  sortBy: SortKey;
  viewerId: number;
  showRank: boolean;
}) {
  return (
    <div className="border border-border-soft overflow-x-auto">
      <table className="w-full">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-border-soft" style={{ background: "#0d1210" }}>
            <Th>{showRank ? "#" : ""}</Th>
            <Th>Player</Th>
            <Th align="right" prominent={sortBy === "gamesPlayed"}>Games</Th>
            <Th align="right" prominent={sortBy === "winRate"}>Win %</Th>
            <Th align="right" prominent={sortBy === "threeDartAvg"}>3-Dart Avg</Th>
            <Th align="right" prominent={sortBy === "ton80s"}>180s</Th>
            <Th align="right" prominent={sortBy === "bestFinish"}>Best</Th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => {
            const isSelf = e.userId === viewerId;
            const name = dn(e.email, e.displayName);
            return (
              <tr
                key={e.userId}
                className="border-b border-border-soft last:border-0"
                style={{ background: isSelf ? "#0f1a12" : "#0a0e0c" }}
              >
                <td className="px-3 py-3 f-display font-black text-muted text-sm align-middle">
                  {showRank ? i + 1 : "—"}
                </td>
                <td className="px-3 py-3 align-middle">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar name={name} color={e.avatarColor} size="sm" />
                    <Link
                      href={`/player/${e.userId}`}
                      className="f-display font-black text-cream text-base hover:text-electric transition-colors truncate"
                    >
                      {name}
                      {isSelf && <span className="text-electric text-xs ml-1.5">you</span>}
                    </Link>
                  </div>
                </td>
                <Td align="right" prominent={sortBy === "gamesPlayed"}>
                  {e.gamesPlayed}
                </Td>
                <Td align="right" prominent={sortBy === "winRate"} highlight={e.winRate >= 50}>
                  {`${e.winRate}%`}
                </Td>
                <Td align="right" prominent={sortBy === "threeDartAvg"}>
                  {e.threeDartAvg > 0 ? e.threeDartAvg.toFixed(2) : "—"}
                </Td>
                <Td align="right" prominent={sortBy === "ton80s"} accent={e.total180s > 0}>
                  {e.total180s}
                </Td>
                <Td align="right" prominent={sortBy === "bestFinish"}>
                  {e.bestFinish > 0 ? e.bestFinish : "—"}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  align = "left",
  prominent = false,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  prominent?: boolean;
}) {
  return (
    <th
      className="px-3 py-2 f-mono text-[10px] uppercase"
      style={{
        letterSpacing: "0.18em",
        textAlign: align,
        color: prominent ? "#d4ff3a" : "#6d736f",
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  prominent = false,
  highlight = false,
  accent = false,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  prominent?: boolean;
  highlight?: boolean;
  accent?: boolean;
}) {
  const isProminent = prominent;
  const color = highlight ? "#d4ff3a" : accent ? "#e63946" : isProminent ? "#f2e8d0" : "#a5b3aa";
  return (
    <td
      className={
        isProminent
          ? "px-3 py-3 f-display font-black text-base align-middle"
          : "px-3 py-3 f-mono text-sm align-middle"
      }
      style={{ textAlign: align, color }}
    >
      {children}
    </td>
  );
}

function Section({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-px w-6 bg-border" />
        <span
          className="f-mono text-xs uppercase text-muted"
          style={{ letterSpacing: "0.25em" }}
        >
          {label}
        </span>
        {count > 0 && <span className="f-mono text-xs text-muted">({count})</span>}
      </div>
      {children}
    </div>
  );
}

function StatBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="border border-border-soft p-4" style={{ background: "#0d1210" }}>
      <div
        className="f-mono text-[9px] uppercase text-muted mb-1"
        style={{ letterSpacing: "0.2em" }}
      >
        {label}
      </div>
      <div
        className="f-display font-black text-3xl"
        style={{ color: highlight ? "#d4ff3a" : "#f2e8d0" }}
      >
        {value}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="f-mono text-xs text-muted py-4">{text}</p>;
}

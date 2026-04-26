"use client";

import { useRouter } from "next/navigation";
import type { Tournament, TournamentMatch, TournamentPlayer } from "@/lib/types";
import { computeStandings } from "@/lib/tournament";
import { displayName } from "@/lib/display";

interface Props {
  tournament: Tournament;
  currentUserId: number;
  onPlayMatch: (matchId: string) => Promise<void>;
}

function playerName(email: string | null, players: TournamentPlayer[]): string {
  if (!email) return "TBD";
  const p = players.find((pl) => pl.email === email);
  return displayName(email, p?.displayName);
}

export function TournamentStandings({ tournament, currentUserId, onPlayMatch }: Props) {
  const router = useRouter();
  const standings = computeStandings(tournament.players, tournament.matches);

  return (
    <div className="space-y-6">
      {/* Standings table */}
      <div>
        <div
          className="f-mono text-[10px] uppercase text-muted mb-3"
          style={{ letterSpacing: "0.2em" }}
        >
          Standings
        </div>
        <div className="border border-border-soft overflow-hidden">
          {/* Header */}
          <div
            className="grid f-mono text-[10px] uppercase text-muted px-4 py-2"
            style={{
              gridTemplateColumns: "2rem 1fr 3rem 3rem",
              letterSpacing: "0.15em",
              background: "#141a17",
            }}
          >
            <span>#</span>
            <span>Player</span>
            <span className="text-center">W</span>
            <span className="text-center">P</span>
          </div>

          {standings.map((s, i) => (
            <div
              key={s.userId}
              className="grid items-center px-4 py-3 border-t border-border-soft"
              style={{
                gridTemplateColumns: "2rem 1fr 3rem 3rem",
                background: i === 0 && tournament.status === "finished" ? "#1c2420" : "#0a0e0c",
              }}
            >
              <span className="f-mono text-xs text-muted">{i + 1}</span>
              <span
                className="f-display font-black text-base"
                style={{
                  color: i === 0 && tournament.status === "finished" ? "#d4ff3a" : "#f2e8d0",
                }}
              >
                {displayName(s.email, s.displayName ?? null)}
              </span>
              <span className="f-display font-black text-base text-center text-cream">{s.wins}</span>
              <span className="f-mono text-xs text-center text-muted">{s.played}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Match list — grouped by half when season_halves=2 */}
      {tournament.seasonHalves >= 2 ? (
        [1, 2].map((half) => {
          const halfMatches = tournament.matches
            .filter((m) => m.round === half)
            .sort((a, b) => a.matchNumber - b.matchNumber);
          if (halfMatches.length === 0) return null;
          return (
            <div key={half}>
              <div className="f-mono text-[10px] uppercase text-muted mb-3" style={{ letterSpacing: "0.2em" }}>
                {half === 1 ? "First half" : "Second half"}
              </div>
              <div className="space-y-2">
                {halfMatches.map((m) => (
                  <MatchRow
                    key={m.id}
                    match={m}
                    currentUserId={currentUserId}
                    players={tournament.players}
                    onPlay={onPlayMatch}
                    onWatch={(gameId) => router.push(`/match/${gameId}`)}
                  />
                ))}
              </div>
            </div>
          );
        })
      ) : (
        <div>
          <div className="f-mono text-[10px] uppercase text-muted mb-3" style={{ letterSpacing: "0.2em" }}>
            Matches
          </div>
          <div className="space-y-2">
            {tournament.matches
              .sort((a, b) => a.matchNumber - b.matchNumber)
              .map((m) => (
                <MatchRow
                  key={m.id}
                  match={m}
                  currentUserId={currentUserId}
                  players={tournament.players}
                  onPlay={onPlayMatch}
                  onWatch={(gameId) => router.push(`/match/${gameId}`)}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MatchRow({
  match,
  currentUserId,
  players,
  onPlay,
  onWatch,
}: {
  match: TournamentMatch;
  currentUserId: number;
  players: TournamentPlayer[];
  onPlay: (matchId: string) => Promise<void>;
  onWatch: (gameId: string) => void;
}) {
  const isParticipant =
    match.player1Id === currentUserId || match.player2Id === currentUserId;
  const p1 = playerName(match.player1Email, players);
  const p2 = playerName(match.player2Email, players);
  const p1Won = match.winnerId !== null && match.winnerId === match.player1Id;
  const p2Won = match.winnerId !== null && match.winnerId === match.player2Id;

  return (
    <div className="border border-border-soft bg-surface flex items-center justify-between px-4 py-3 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="f-display font-black text-base"
          style={{ color: p1Won ? "#d4ff3a" : p2Won ? "#454b47" : "#f2e8d0" }}
        >
          {p1}
        </span>
        <span className="f-mono text-xs text-muted">vs</span>
        <span
          className="f-display font-black text-base"
          style={{ color: p2Won ? "#d4ff3a" : p1Won ? "#454b47" : "#f2e8d0" }}
        >
          {p2}
        </span>
      </div>

      <div className="shrink-0 flex items-center gap-2">
        {match.status === "finished" && (
          <span className="f-mono text-[10px] uppercase text-muted" style={{ letterSpacing: "0.15em" }}>
            Done
          </span>
        )}
        {match.status === "ready" && isParticipant && (
          <button
            onClick={() => onPlay(match.id)}
            className="f-mono text-[10px] uppercase text-electric hover:text-cream"
            style={{ letterSpacing: "0.15em" }}
          >
            Play →
          </button>
        )}
        {match.status === "active" && match.gameId && (
          <button
            onClick={() => onWatch(match.gameId!)}
            className="f-mono text-[10px] uppercase text-muted hover:text-cream"
            style={{ letterSpacing: "0.15em" }}
          >
            {isParticipant ? "Play →" : "Watch →"}
          </button>
        )}
        {match.status === "pending" && (
          <span className="f-mono text-[10px] text-muted">–</span>
        )}
      </div>
    </div>
  );
}

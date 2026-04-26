"use client";

import { useRouter } from "next/navigation";
import type { Tournament, TournamentMatch, TournamentPlayer } from "@/lib/types";
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

function roundLabel(round: number, totalRounds: number): string {
  if (round === totalRounds) return "Final";
  if (round === totalRounds - 1) return "Semi-final";
  if (round === totalRounds - 2) return "Quarter-final";
  return `Round ${round}`;
}

function MatchCard({
  match,
  currentUserId,
  players,
  onPlay,
}: {
  match: TournamentMatch;
  currentUserId: number;
  players: TournamentPlayer[];
  onPlay: (matchId: string) => Promise<void>;
}) {
  const router = useRouter();
  const isParticipant =
    match.player1Id === currentUserId || match.player2Id === currentUserId;

  const p1Name = playerName(match.player1Email, players);
  const p2Name = playerName(match.player2Email, players);

  const p1Won = match.winnerId !== null && match.winnerId === match.player1Id;
  const p2Won = match.winnerId !== null && match.winnerId === match.player2Id;

  if (match.status === "bye") {
    const advancedName = match.player1Id ? p1Name : p2Name;
    return (
      <div className="border border-border-soft bg-surface px-3 py-2 min-w-[160px]">
        <div className="f-mono text-[9px] uppercase text-muted mb-1.5" style={{ letterSpacing: "0.15em" }}>
          BYE
        </div>
        <div className="f-display font-black text-sm text-electric">{advancedName}</div>
        <div className="f-mono text-[9px] text-muted mt-0.5">Auto-advance</div>
      </div>
    );
  }

  return (
    <div
      className="border bg-surface min-w-[160px]"
      style={{ borderColor: match.status === "finished" ? "#2a332d" : "#1f2824" }}
    >
      {/* Player 1 */}
      <div
        className="px-3 py-2 border-b"
        style={{
          borderColor: "#1f2824",
          background: p1Won ? "#1c2420" : "transparent",
        }}
      >
        <div
          className="f-display font-black text-sm"
          style={{ color: match.player1Id ? (p1Won ? "#d4ff3a" : "#f2e8d0") : "#454b47" }}
        >
          {p1Name}
        </div>
      </div>

      {/* Player 2 */}
      <div
        className="px-3 py-2"
        style={{ background: p2Won ? "#1c2420" : "transparent" }}
      >
        <div
          className="f-display font-black text-sm"
          style={{ color: match.player2Id ? (p2Won ? "#d4ff3a" : "#f2e8d0") : "#454b47" }}
        >
          {p2Name}
        </div>
      </div>

      {/* Action */}
      {match.status === "ready" && isParticipant && (
        <div className="px-3 py-2 border-t" style={{ borderColor: "#1f2824" }}>
          <button
            onClick={() => onPlay(match.id)}
            className="f-mono text-[10px] uppercase text-electric hover:text-cream"
            style={{ letterSpacing: "0.15em" }}
          >
            Play →
          </button>
        </div>
      )}
      {match.status === "active" && match.gameId && (
        <div className="px-3 py-2 border-t" style={{ borderColor: "#1f2824" }}>
          <button
            onClick={() => router.push(`/match/${match.gameId}`)}
            className="f-mono text-[10px] uppercase text-muted hover:text-cream"
            style={{ letterSpacing: "0.15em" }}
          >
            {isParticipant ? "Play →" : "Watch →"}
          </button>
        </div>
      )}
    </div>
  );
}

export function TournamentBracket({ tournament, currentUserId, onPlayMatch }: Props) {
  // Group matches by round
  const rounds = new Map<number, TournamentMatch[]>();
  for (const m of tournament.matches) {
    const arr = rounds.get(m.round) ?? [];
    arr.push(m);
    rounds.set(m.round, arr);
  }
  const sortedRounds = Array.from(rounds.keys()).sort((a, b) => a - b);
  const totalRounds = sortedRounds.length;

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-6 min-w-max">
        {sortedRounds.map((round) => {
          const matches = (rounds.get(round) ?? []).sort((a, b) => a.matchNumber - b.matchNumber);
          return (
            <div key={round} className="flex flex-col gap-3">
              <div
                className="f-mono text-[10px] uppercase text-muted mb-1"
                style={{ letterSpacing: "0.2em" }}
              >
                {roundLabel(round, totalRounds)}
              </div>
              <div className="flex flex-col gap-3">
                {matches.map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    currentUserId={currentUserId}
                    players={tournament.players}
                    onPlay={onPlayMatch}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

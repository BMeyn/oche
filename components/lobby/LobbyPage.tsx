"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, LogOut, Trophy, Clock } from "lucide-react";
import { BrandMark } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/Avatar";
import { CreateGameForm } from "./CreateGameForm";
import { OpenGames } from "./OpenGames";
import { CreateTournamentForm } from "@/components/tournament/CreateTournamentForm";
import { YourTournaments } from "@/components/tournament/YourTournaments";
import type { User } from "@/lib/types";
import { displayName as dn } from "@/lib/display";

interface Props {
  user: User;
  pendingFriendRequests: number;
}

export function LobbyPage({ user, pendingFriendRequests }: Props) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateTournament, setShowCreateTournament] = useState(false);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  const name = dn(user.email, user.displayName);

  return (
    <div className="min-h-screen flex flex-col bg-ink">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-soft">
        <BrandMark />
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/settings")}
            className="flex items-center gap-2 text-muted hover:text-cream"
            title="Settings"
          >
            <span className="relative">
              <Avatar name={name} color={user.avatarColor} size="sm" />
              {pendingFriendRequests > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-oche-red border border-ink"
                />
              )}
            </span>
            <span className="f-mono text-xs text-bone hidden sm:block">{name}</span>
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 f-mono text-xs uppercase text-muted hover:text-cream"
            style={{ letterSpacing: "0.18em" }}
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-10 max-w-2xl w-full mx-auto">
        <div className="rise">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-10 bg-oche-red" />
            <span
              className="f-mono text-xs uppercase text-oche-red"
              style={{ letterSpacing: "0.25em" }}
            >
              lobby
            </span>
          </div>

          <h1
            className="f-display font-black leading-[0.9] mb-10 text-cream"
            style={{ fontSize: "clamp(36px, 6vw, 72px)" }}
          >
            STEP TO<br />THE <span className="text-electric">OCHE.</span>
          </h1>

          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2.5 f-display font-black text-xl uppercase px-6 py-3.5"
              style={{ background: "#d4ff3a", color: "#0a0e0c" }}
            >
              <Plus className="w-5 h-5" strokeWidth={3} />
              Create game
            </button>
            <button
              onClick={() => setShowCreateTournament(true)}
              className="flex items-center gap-2.5 f-display font-black text-xl uppercase px-6 py-3.5 border border-border"
              style={{ color: "#f2e8d0" }}
            >
              <Trophy className="w-5 h-5" strokeWidth={2} />
              Tournament
            </button>
          </div>

          <p className="f-mono text-sm text-muted max-w-sm">
            Create a game and share the link with your opponent. They'll be able to join directly.
          </p>

          <YourTournaments currentUserId={user.id} />
          <OpenGames currentUserId={user.id} />
        </div>
      </div>

      {/* History shortcut — bottom right */}
      <button
        onClick={() => router.push("/history")}
        className="fixed bottom-6 right-6 flex items-center gap-2 f-mono text-xs uppercase text-muted hover:text-cream border border-border-soft px-4 py-2.5"
        style={{ background: "#0d1210", letterSpacing: "0.18em" }}
      >
        <Clock className="w-3.5 h-3.5" /> History
      </button>

      {showCreate && <CreateGameForm onClose={() => setShowCreate(false)} />}
      {showCreateTournament && <CreateTournamentForm onClose={() => setShowCreateTournament(false)} />}
    </div>
  );
}

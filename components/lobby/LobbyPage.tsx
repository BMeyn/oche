"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, LogOut } from "lucide-react";
import { BrandMark } from "@/components/ui/primitives";
import { CreateGameForm } from "./CreateGameForm";
import { OpenGames } from "./OpenGames";

interface Props {
  userId: number;
  userEmail: string;
}

export function LobbyPage({ userId, userEmail }: Props) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-ink">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-soft">
        <BrandMark />
        <div className="flex items-center gap-4">
          <span className="f-mono text-xs text-bone hidden sm:block">
            {userEmail.split("@")[0]}
          </span>
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

          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2.5 f-display font-black text-xl uppercase px-6 py-3.5 mb-6"
            style={{ background: "#d4ff3a", color: "#0a0e0c" }}
          >
            <Plus className="w-5 h-5" strokeWidth={3} />
            Create game
          </button>

          <p className="f-mono text-sm text-muted max-w-sm">
            Create a game and share the link with your opponent. They'll be able to join directly.
          </p>

          <OpenGames currentUserId={userId} />
        </div>
      </div>

      {showCreate && <CreateGameForm onClose={() => setShowCreate(false)} />}
    </div>
  );
}

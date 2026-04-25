import { getCurrentUser } from "@/lib/auth";
import { getGame } from "@/lib/db/games";
import { redirect, notFound } from "next/navigation";
import { MatchClient } from "./MatchClient";

export const dynamic = "force-dynamic";

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, game] = await Promise.all([getCurrentUser(), getGame(id)]);

  if (!user) redirect("/login");
  if (!game) notFound();

  return <MatchClient game={game} currentUserId={user.id} />;
}

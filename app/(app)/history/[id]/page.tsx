import { getCurrentUser } from "@/lib/auth";
import { getGame } from "@/lib/db/games";
import { redirect, notFound } from "next/navigation";
import { GameDetailPage } from "@/components/history/GameDetailPage";

export const dynamic = "force-dynamic";

export default async function GameDetailServerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, game] = await Promise.all([getCurrentUser(), getGame(id)]);

  if (!user) redirect("/login");
  if (!game) notFound();
  if (game.status !== "finished" || !game.matchState) notFound();

  const isParticipant =
    game.player1Id === user.id || game.player2Id === user.id;
  if (!isParticipant) notFound();

  return <GameDetailPage game={game} currentUserId={user.id} />;
}

import { getCurrentUser } from "@/lib/auth";
import { getGame } from "@/lib/db/games";
import { redirect, notFound } from "next/navigation";
import { HistoryClient } from "./HistoryClient";

export const dynamic = "force-dynamic";

export default async function MatchHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tournament?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [user, game] = await Promise.all([getCurrentUser(), getGame(id)]);

  if (!user) redirect("/login");
  if (!game) notFound();

  return <HistoryClient game={game} tournamentId={sp.tournament} />;
}

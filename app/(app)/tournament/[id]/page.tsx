import { getCurrentUser } from "@/lib/auth";
import { getTournament } from "@/lib/db/tournaments";
import { redirect, notFound } from "next/navigation";
import { TournamentClient } from "./TournamentClient";

export const dynamic = "force-dynamic";

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, tournament] = await Promise.all([getCurrentUser(), getTournament(id)]);
  if (!user) redirect("/login");
  if (!tournament) notFound();
  return <TournamentClient tournament={tournament} currentUserId={user.id} user={user} />;
}

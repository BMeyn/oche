import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getGameHistory, getTournamentHistory } from "@/lib/db/history";
import { HistoryPage } from "@/components/history/HistoryPage";

export const dynamic = "force-dynamic";

export default async function HistoryServerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [games, tournaments] = await Promise.all([
    getGameHistory(user.id),
    getTournamentHistory(user.id),
  ]);

  return <HistoryPage games={games} tournaments={tournaments} user={user} />;
}

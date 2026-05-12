import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLeaderboard } from "@/lib/db/leaderboard";
import { LeaderboardPage } from "@/components/leaderboard/LeaderboardPage";

export const dynamic = "force-dynamic";

export default async function LeaderboardServerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const entries = await getLeaderboard();

  return <LeaderboardPage entries={entries} viewerId={user.id} />;
}

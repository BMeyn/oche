import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LobbyPage } from "@/components/lobby/LobbyPage";
import { getPendingRequests } from "@/lib/db/friends";

export const dynamic = "force-dynamic";

export default async function Lobby() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  let incomingCount = 0;
  try {
    const pending = await getPendingRequests(user.id);
    incomingCount = pending.filter((r) => r.direction === "incoming").length;
  } catch {
    // friend_requests table may not exist yet (migration pending)
  }
  return <LobbyPage user={user} pendingFriendRequests={incomingCount} />;
}

import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LobbyPage } from "@/components/lobby/LobbyPage";

export const dynamic = "force-dynamic";

export default async function Lobby() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <LobbyPage userId={user.id} userEmail={user.email} />;
}

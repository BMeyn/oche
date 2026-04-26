import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getFriends, getPendingRequests } from "@/lib/db/friends";
import { SettingsPage } from "@/components/settings/SettingsPage";

export const dynamic = "force-dynamic";

export default async function Settings() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [friends, requests] = await Promise.all([
    getFriends(user.id),
    getPendingRequests(user.id),
  ]);

  return (
    <SettingsPage user={user} friends={friends} requests={requests} />
  );
}

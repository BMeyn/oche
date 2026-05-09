import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getUserById } from "@/lib/db/users";
import { getGameHistory } from "@/lib/db/history";
import { getHeadToHead } from "@/lib/db/friends";
import { PlayerProfilePage } from "@/components/profile/PlayerProfilePage";

export const dynamic = "force-dynamic";

export default async function PlayerProfileServerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await getCurrentUser();
  if (!viewer) redirect("/login");

  const { id } = await params;
  const targetId = Number(id);
  if (!Number.isInteger(targetId) || targetId <= 0) notFound();

  const target = await getUserById(targetId);
  if (!target) notFound();

  const isSelf = viewer.id === target.id;

  const [games, h2h] = await Promise.all([
    getGameHistory(target.id),
    isSelf ? Promise.resolve(null) : getHeadToHead(viewer.id, target.id),
  ]);

  return (
    <PlayerProfilePage target={target} viewer={viewer} games={games} h2h={h2h} />
  );
}

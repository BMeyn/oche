import { sql } from "@/lib/db";
import type { FriendEntry, HeadToHead, HeadToHeadRecentMatch, Match } from "@/lib/types";

function requireSql() {
  if (!sql) throw new Error("DATABASE_URL is not configured");
  return sql;
}

function rowToFriend(
  row: Record<string, unknown>,
  currentUserId: number,
): FriendEntry {
  const isRequester = Number(row.requester_id) === currentUserId;
  const userId = isRequester ? Number(row.addressee_id) : Number(row.requester_id);
  const email = isRequester
    ? (row.addressee_email as string)
    : (row.requester_email as string);
  const displayName = isRequester
    ? (row.addressee_display_name as string | null)
    : (row.requester_display_name as string | null);
  const avatarColor = isRequester
    ? (row.addressee_avatar_color as string)
    : (row.requester_avatar_color as string);

  return {
    requestId: Number(row.id),
    userId,
    email,
    displayName,
    avatarColor: avatarColor ?? "#6d736f",
    status: row.status as "pending" | "accepted",
    direction: isRequester ? "outgoing" : "incoming",
  };
}

export async function getPendingRequests(userId: number): Promise<FriendEntry[]> {
  const db = requireSql();
  const rows = await db`
    SELECT
      fr.id, fr.requester_id, fr.addressee_id, fr.status,
      ur.email AS requester_email, ur.display_name AS requester_display_name, ur.avatar_color AS requester_avatar_color,
      ua.email AS addressee_email, ua.display_name AS addressee_display_name, ua.avatar_color AS addressee_avatar_color
    FROM friend_requests fr
    JOIN users ur ON ur.id = fr.requester_id
    JOIN users ua ON ua.id = fr.addressee_id
    WHERE (fr.requester_id = ${userId} OR fr.addressee_id = ${userId})
      AND fr.status = 'pending'
    ORDER BY fr.created_at DESC
  `;
  return rows.map((r) => rowToFriend(r, userId));
}

export async function getFriends(userId: number): Promise<FriendEntry[]> {
  const db = requireSql();

  const rows = await db`
    SELECT
      fr.id, fr.requester_id, fr.addressee_id, fr.status,
      ur.email AS requester_email, ur.display_name AS requester_display_name, ur.avatar_color AS requester_avatar_color,
      ua.email AS addressee_email, ua.display_name AS addressee_display_name, ua.avatar_color AS addressee_avatar_color
    FROM friend_requests fr
    JOIN users ur ON ur.id = fr.requester_id
    JOIN users ua ON ua.id = fr.addressee_id
    WHERE (fr.requester_id = ${userId} OR fr.addressee_id = ${userId})
      AND fr.status = 'accepted'
    ORDER BY fr.created_at DESC
  `;

  const friends = rows.map((r) => rowToFriend(r, userId));

  // Attach true head-to-head stats for each friend (viewer vs that friend only).
  await Promise.all(
    friends.map(async (f) => {
      const h2h = await getHeadToHead(userId, f.userId);
      f.gamesPlayed = h2h.gamesPlayed;
      f.winRate =
        h2h.gamesPlayed > 0
          ? Math.round((h2h.viewerWins / h2h.gamesPlayed) * 100)
          : 0;
    }),
  );

  return friends;
}

export async function getHeadToHead(
  viewerId: number,
  targetId: number,
): Promise<HeadToHead> {
  if (viewerId === targetId) {
    return { gamesPlayed: 0, viewerWins: 0, targetWins: 0, lastMeeting: null, recent: [] };
  }
  const db = sql;
  if (!db) {
    return { gamesPlayed: 0, viewerWins: 0, targetWins: 0, lastMeeting: null, recent: [] };
  }

  const rows = await db`
    SELECT g.id, g.finished_at, g.player1_id, g.player2_id, g.match_state
    FROM games g
    WHERE g.status = 'finished'
      AND g.match_state IS NOT NULL
      AND (
        (g.player1_id = ${viewerId} AND g.player2_id = ${targetId})
        OR (g.player1_id = ${targetId} AND g.player2_id = ${viewerId})
      )
    ORDER BY g.finished_at DESC NULLS LAST
  `;

  let viewerWins = 0;
  let targetWins = 0;
  const recent: HeadToHeadRecentMatch[] = [];
  let lastMeeting: Date | null = null;

  for (const row of rows) {
    try {
      const match = row.match_state as Match;
      if (match.winner === null) continue;
      const viewerIsP1 = Number(row.player1_id) === viewerId;
      const viewerIdx = (viewerIsP1 ? 0 : 1) as 0 | 1;
      const targetIdx = (1 - viewerIdx) as 0 | 1;
      const viewerWon = match.winner === viewerIdx;
      if (viewerWon) viewerWins += 1;
      else targetWins += 1;
      const finishedAt = (row.finished_at as Date) ?? new Date();
      if (lastMeeting === null) lastMeeting = finishedAt;
      if (recent.length < 5) {
        recent.push({
          gameId: row.id as string,
          finishedAt,
          viewerLegs: match.legsWon[viewerIdx],
          targetLegs: match.legsWon[targetIdx],
          viewerWon,
        });
      }
    } catch {
      // skip malformed records
    }
  }

  return {
    gamesPlayed: viewerWins + targetWins,
    viewerWins,
    targetWins,
    lastMeeting,
    recent,
  };
}

export async function sendFriendRequest(
  requesterId: number,
  addresseeEmail: string,
): Promise<void> {
  const db = requireSql();

  const [addressee] = await db`
    SELECT id FROM users WHERE email = ${addresseeEmail}
  `;
  if (!addressee) throw new Error("User not found");
  const addresseeId = Number(addressee.id);
  if (addresseeId === requesterId) throw new Error("Cannot add yourself");

  // Check for existing relationship
  const [existing] = await db`
    SELECT id, status FROM friend_requests
    WHERE (requester_id = ${requesterId} AND addressee_id = ${addresseeId})
       OR (requester_id = ${addresseeId} AND addressee_id = ${requesterId})
  `;
  if (existing) {
    if (existing.status === "accepted") throw new Error("Already friends");
    if (existing.status === "pending") throw new Error("Request already sent");
    // declined — allow re-sending by deleting old record first
    await db`DELETE FROM friend_requests WHERE id = ${existing.id as number}`;
  }

  await db`
    INSERT INTO friend_requests (requester_id, addressee_id)
    VALUES (${requesterId}, ${addresseeId})
  `;
}

export async function respondToRequest(
  requestId: number,
  userId: number,
  action: "accept" | "decline",
): Promise<void> {
  const db = requireSql();
  const [req] = await db`
    SELECT id, addressee_id FROM friend_requests
    WHERE id = ${requestId} AND status = 'pending'
  `;
  if (!req) throw new Error("Request not found");
  if (Number(req.addressee_id) !== userId) throw new Error("Not authorised");

  await db`
    UPDATE friend_requests
    SET status = ${action === "accept" ? "accepted" : "declined"}
    WHERE id = ${requestId}
  `;
}

export async function removeFriend(userId: number, friendId: number): Promise<void> {
  const db = requireSql();
  await db`
    DELETE FROM friend_requests
    WHERE status = 'accepted'
      AND (
        (requester_id = ${userId} AND addressee_id = ${friendId})
        OR (requester_id = ${friendId} AND addressee_id = ${userId})
      )
  `;
}

export async function cancelRequest(requestId: number, userId: number): Promise<void> {
  const db = requireSql();
  await db`
    DELETE FROM friend_requests
    WHERE id = ${requestId}
      AND requester_id = ${userId}
      AND status = 'pending'
  `;
}

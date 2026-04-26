import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateProfile } from "@/lib/db/users";

const ALLOWED_COLORS = new Set([
  "#d4ff3a", "#e63946", "#4ecdc4", "#f7931e",
  "#9b59b6", "#3498db", "#f2e8d0", "#6d736f",
]);

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const displayName = typeof body.displayName === "string" ? body.displayName.trim().slice(0, 30) : undefined;
  const avatarColor = typeof body.avatarColor === "string" && ALLOWED_COLORS.has(body.avatarColor)
    ? body.avatarColor
    : undefined;

  if (displayName === undefined && avatarColor === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await updateProfile(user.id, { displayName, avatarColor });
  return NextResponse.json(updated);
}

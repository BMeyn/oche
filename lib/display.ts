/** Returns a player's display name: custom name if set, else email prefix. */
export function displayName(email: string, name?: string | null): string {
  return name?.trim() || email.split("@")[0];
}

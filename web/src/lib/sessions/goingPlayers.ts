import type { Attendance, Player } from "@/lib/domain/types";

/**
 * Going players for a fecha, ordered for list avatars:
 * creator first (if Voy), then A–Z by displayName (es).
 */
export function goingFrom(
  sessionId: string,
  attendances: Attendance[],
  players: Player[],
  createdById: string,
): { players: Player[]; count: number } {
  const ids = new Set(
    attendances
      .filter((a) => a.sessionId === sessionId && a.status === "going")
      .map((a) => a.playerId),
  );
  const list = players
    .filter((p) => ids.has(p.id))
    .sort((a, b) => {
      if (a.id === createdById) return -1;
      if (b.id === createdById) return 1;
      return a.displayName.localeCompare(b.displayName, "es");
    });
  return { players: list, count: list.length };
}

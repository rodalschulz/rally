/**
 * Detect Singles Games (#1) leader change between two ordered ranking id lists.
 * Returns null if no meaningful change (same leader, or either side empty).
 */
export function detectLeaderChange(
  previousLeaderId: string | null | undefined,
  nextLeaderId: string | null | undefined,
): { previousId: string; nextId: string } | null {
  if (!previousLeaderId || !nextLeaderId) return null;
  if (previousLeaderId === nextLeaderId) return null;
  return { previousId: previousLeaderId, nextId: nextLeaderId };
}

/** First active player from a ranking already sorted best-first. Inactive rows have no place. */
export function leaderIdFromRows(
  rows: ReadonlyArray<{ playerId: string; inactive?: boolean }>,
): string | null {
  return rows.find((row) => !row.inactive)?.playerId ?? null;
}

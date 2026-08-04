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

/** First player id from a ranking rows array (already sorted best-first). */
export function leaderIdFromRows(
  rows: ReadonlyArray<{ playerId: string }>,
): string | null {
  return rows[0]?.playerId ?? null;
}

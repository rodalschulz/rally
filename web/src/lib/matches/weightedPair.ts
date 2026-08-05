/**
 * Pick two distinct players for a Singles Game, weighted so those with
 * fewer Games in the current Fecha are more likely to be chosen.
 */

export type PairSides = {
  sideA: string[];
  sideB: string[];
};

/** Games played by each id (sideA[0] / sideB[0] of each match). */
export function countGamesByPlayer(
  playerIds: string[],
  games: PairSides[],
): Map<string, number> {
  const counts = new Map(playerIds.map((id) => [id, 0]));
  for (const g of games) {
    const a = g.sideA[0];
    const b = g.sideB[0];
    if (a && counts.has(a)) counts.set(a, (counts.get(a) ?? 0) + 1);
    if (b && counts.has(b)) counts.set(b, (counts.get(b) ?? 0) + 1);
  }
  return counts;
}

/** Higher when the player has played fewer games (max − count + 1). */
export function gamePairWeight(
  count: number,
  maxCount: number,
): number {
  return Math.max(1, maxCount - count + 1);
}

function pickWeightedId(
  ids: string[],
  weightOf: (id: string) => number,
  random: () => number,
): string | null {
  if (ids.length === 0) return null;
  let total = 0;
  for (const id of ids) total += weightOf(id);
  if (total <= 0) return ids[0] ?? null;

  let r = random() * total;
  for (const id of ids) {
    r -= weightOf(id);
    if (r <= 0) return id;
  }
  return ids[ids.length - 1] ?? null;
}

/**
 * Returns two player ids (as side A / B). `random` in [0, 1) for tests.
 * Null if fewer than two candidates.
 */
export function pickFairGamePair(
  playerIds: string[],
  games: PairSides[],
  random: () => number = Math.random,
): { player1Id: string; player2Id: string } | null {
  const unique = [...new Set(playerIds.filter(Boolean))];
  if (unique.length < 2) return null;

  const counts = countGamesByPlayer(unique, games);
  const maxCount = Math.max(0, ...counts.values());
  const weightOf = (id: string) =>
    gamePairWeight(counts.get(id) ?? 0, maxCount);

  const first = pickWeightedId(unique, weightOf, random);
  if (!first) return null;

  const rest = unique.filter((id) => id !== first);
  const second = pickWeightedId(rest, weightOf, random);
  if (!second) return null;

  // Randomize who is side A vs B so the form isn't biased.
  if (random() < 0.5) {
    return { player1Id: second, player2Id: first };
  }
  return { player1Id: first, player2Id: second };
}

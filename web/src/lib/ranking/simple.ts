import type { Match, MatchUnit, PlayerId, RankingRow } from "../domain/types";

const POINTS_BY_UNIT: Record<MatchUnit, number> = {
  game: 1,
  set: 3,
};

/** W-L + points by unit. Sets do not expand into loose games. */
export function buildRanking(
  matches: Match[],
  format: "singles" | "doubles",
  unit: MatchUnit = "set",
): RankingRow[] {
  const pointsPerWin = POINTS_BY_UNIT[unit];
  const filtered = matches.filter(
    (m) => m.format === format && m.unit === unit,
  );
  const stats = new Map<PlayerId, RankingRow>();

  const bump = (id: PlayerId) => {
    let row = stats.get(id);
    if (!row) {
      row = { playerId: id, played: 0, wins: 0, losses: 0, points: 0 };
      stats.set(id, row);
    }
    return row;
  };

  for (const m of filtered) {
    // Soft-deleted / En curso do not affect ranking.
    if (m.deletedAt) continue;
    if (m.winnerSide !== "A" && m.winnerSide !== "B") continue;
    const winners = m.winnerSide === "A" ? m.sideA : m.sideB;
    const losers = m.winnerSide === "A" ? m.sideB : m.sideA;
    for (const id of winners) {
      const r = bump(id);
      r.played += 1;
      r.wins += 1;
      r.points += pointsPerWin;
    }
    for (const id of losers) {
      const r = bump(id);
      r.played += 1;
      r.losses += 1;
    }
  }

  return [...stats.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.playerId.localeCompare(b.playerId);
  });
}

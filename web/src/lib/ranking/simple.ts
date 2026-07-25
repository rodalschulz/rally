import type { Match, PlayerId, RankingRow } from "../domain/types";

/** Simple W-L + 3pts win / 0 loss. Easy to swap later for ELO. */
export function buildRanking(
  matches: Match[],
  format: "singles" | "doubles",
): RankingRow[] {
  const filtered = matches.filter((m) => m.format === format);
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
    const winners = m.winnerSide === "A" ? m.sideA : m.sideB;
    const losers = m.winnerSide === "A" ? m.sideB : m.sideA;
    for (const id of winners) {
      const r = bump(id);
      r.played += 1;
      r.wins += 1;
      r.points += 3;
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

import type { Match, MatchUnit, PlayerId, RankingRow } from "../domain/types";
import { compareMatches } from "./matchOrder";

export const ELO_INITIAL = 1000;
export const ELO_K_BY_UNIT: Record<MatchUnit, number> = {
  game: 24,
  set: 32,
};

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

/**
 * Classic Elo for singles, one ladder per unit. Sets do not expand into games.
 * Only players with at least one result appear — except when the ladder has no
 * results yet: then seed all `memberIds` at 1000 so the board is never empty.
 * Sort: Elo desc, then display name (es), then playerId.
 */
export function buildEloRanking(
  matches: Match[],
  unit: MatchUnit,
  memberIds: PlayerId[] = [],
  displayNameById: ReadonlyMap<PlayerId, string> = new Map(),
): RankingRow[] {
  const k = ELO_K_BY_UNIT[unit];
  const filtered = matches
    .filter((m) => m.format === "singles" && m.unit === unit)
    .slice()
    .sort(compareMatches);

  const ratings = new Map<PlayerId, number>();
  const stats = new Map<PlayerId, RankingRow>();

  const bump = (id: PlayerId) => {
    let row = stats.get(id);
    if (!row) {
      row = { playerId: id, played: 0, wins: 0, losses: 0, points: ELO_INITIAL };
      stats.set(id, row);
      ratings.set(id, ELO_INITIAL);
    }
    return row;
  };

  const ratingOf = (id: PlayerId) => {
    bump(id);
    return ratings.get(id) ?? ELO_INITIAL;
  };

  for (const m of filtered) {
    // Soft-deleted / En curso do not affect Elo.
    if (m.deletedAt) continue;
    if (m.winnerSide !== "A" && m.winnerSide !== "B") continue;
    const winnerId = (m.winnerSide === "A" ? m.sideA : m.sideB)[0];
    const loserId = (m.winnerSide === "A" ? m.sideB : m.sideA)[0];
    if (!winnerId || !loserId || winnerId === loserId) continue;

    const ra = ratingOf(winnerId);
    const rb = ratingOf(loserId);
    const ea = expectedScore(ra, rb);
    const eb = expectedScore(rb, ra);
    const nextA = ra + k * (1 - ea);
    const nextB = rb + k * (0 - eb);
    ratings.set(winnerId, nextA);
    ratings.set(loserId, nextB);

    const w = bump(winnerId);
    w.played += 1;
    w.wins += 1;
    w.points = Math.round(nextA);

    const l = bump(loserId);
    l.played += 1;
    l.losses += 1;
    l.points = Math.round(nextB);
  }

  const anyonePlayed = [...stats.values()].some((r) => r.played > 0);
  // Nobody has played this ladder yet → show all members at 1000.
  if (!anyonePlayed) {
    for (const id of memberIds) bump(id);
  }

  const nameOf = (id: PlayerId) => displayNameById.get(id) ?? id;
  const rows = anyonePlayed
    ? [...stats.values()].filter((r) => r.played > 0)
    : [...stats.values()];

  return rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const byName = nameOf(a.playerId).localeCompare(nameOf(b.playerId), "es", {
      sensitivity: "base",
    });
    if (byName !== 0) return byName;
    return a.playerId.localeCompare(b.playerId);
  });
}

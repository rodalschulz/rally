import type { Match, MatchUnit, PlayerId, RankingRow } from "../domain/types";

export const ELO_INITIAL = 1000;
export const ELO_K_BY_UNIT: Record<MatchUnit, number> = {
  game: 24,
  set: 32,
};

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

function orderKey(m: Match): [number, number, string] {
  const sessionMs = m.sessionStartsAt
    ? Date.parse(m.sessionStartsAt)
    : 0;
  const createdMs = m.createdAt ? Date.parse(m.createdAt) : 0;
  return [sessionMs, createdMs, m.id];
}

function compareMatches(a: Match, b: Match): number {
  const [as, ac, aid] = orderKey(a);
  const [bs, bc, bid] = orderKey(b);
  if (as !== bs) return as - bs;
  if (ac !== bc) return ac - bc;
  return aid.localeCompare(bid);
}

/**
 * Classic Elo for singles, one ladder per unit. Sets do not expand into games.
 * `memberIds` seeds every group member at the initial rating (0–0) so the board
 * is never empty just because nobody has played yet.
 */
export function buildEloRanking(
  matches: Match[],
  unit: MatchUnit,
  memberIds: PlayerId[] = [],
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

  for (const id of memberIds) bump(id);

  const ratingOf = (id: PlayerId) => {
    bump(id);
    return ratings.get(id) ?? ELO_INITIAL;
  };

  for (const m of filtered) {
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

  return [...stats.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.playerId.localeCompare(b.playerId);
  });
}

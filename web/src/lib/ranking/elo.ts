import type { Match, MatchUnit, PlayerId, RankingRow } from "../domain/types";
import { tryParseSetGames } from "../domain/gameScore";
import { compareMatches } from "./matchOrder";

export const ELO_INITIAL = 1000;
export const ELO_K_BY_UNIT: Record<MatchUnit, number> = {
  game: 24,
  set: 32,
};

/** Game difference of a "standard" set (6-4, 7-5). Margin factor = 1 at this diff. */
export const SET_ELO_STANDARD_MARGIN = 2;

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

/**
 * Sets-only weight on K. ln(diff+1) / ln(3) so 6-4 stays the baseline:
 * 7-6 ≈ 0.63×, 6-4 = 1×, 6-0 ≈ 1.77×. Missing/unparseable score → 1.
 * Games never use this (always 1).
 */
export function setEloMarginFactor(score: string): number {
  const parsed = tryParseSetGames(score);
  if (!parsed) return 1;
  const diff = Math.abs(parsed.gamesA - parsed.gamesB);
  if (diff < 1) return 1;
  return Math.log(diff + 1) / Math.log(SET_ELO_STANDARD_MARGIN + 1);
}

export function eloKForMatch(m: Match): number {
  const base = ELO_K_BY_UNIT[m.unit];
  if (m.unit !== "set") return base;
  return base * setEloMarginFactor(m.score);
}

/**
 * Apply one finished singles result to an in-memory ratings map.
 * Sets scale K by game margin; Games stay binary at K=24.
 */
export function applySinglesElo(
  ratings: Map<PlayerId, number>,
  m: Match,
): void {
  const winnerId = (m.winnerSide === "A" ? m.sideA : m.sideB)[0];
  const loserId = (m.winnerSide === "A" ? m.sideB : m.sideA)[0];
  if (!winnerId || !loserId || winnerId === loserId) return;

  const k = eloKForMatch(m);
  const ra = ratings.get(winnerId) ?? ELO_INITIAL;
  const rb = ratings.get(loserId) ?? ELO_INITIAL;
  const ea = expectedScore(ra, rb);
  const eb = expectedScore(rb, ra);
  ratings.set(winnerId, ra + k * (1 - ea));
  ratings.set(loserId, rb + k * (0 - eb));
}

/**
 * Classic Elo for singles, one ladder per unit. Sets do not expand into games.
 * Set K is scaled by game-margin (6-0 moves more than 6-4); Games stay binary.
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

    ratingOf(winnerId);
    ratingOf(loserId);
    applySinglesElo(ratings, m);
    const nextA = ratings.get(winnerId) ?? ELO_INITIAL;
    const nextB = ratings.get(loserId) ?? ELO_INITIAL;

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

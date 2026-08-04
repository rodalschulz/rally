import type { Match, MatchUnit, PlayerId } from "../domain/types";
import { ELO_INITIAL, ELO_K_BY_UNIT } from "./elo";

export type SessionResumenRow = {
  playerId: PlayerId;
  wins: number;
  losses: number;
  eloStart: number;
  eloEnd: number;
};

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

function orderKey(m: Match): [number, number, string] {
  const sessionMs = m.sessionStartsAt ? Date.parse(m.sessionStartsAt) : 0;
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

function isCountableSingles(m: Match, unit: MatchUnit): boolean {
  if (m.format !== "singles" || m.unit !== unit) return false;
  if (m.deletedAt) return false;
  if (m.winnerSide !== "A" && m.winnerSide !== "B") return false;
  const winnerId = (m.winnerSide === "A" ? m.sideA : m.sideB)[0];
  const loserId = (m.winnerSide === "A" ? m.sideB : m.sideA)[0];
  return Boolean(winnerId && loserId && winnerId !== loserId);
}

function applyElo(
  ratings: Map<PlayerId, number>,
  m: Match,
  k: number,
): void {
  const winnerId = (m.winnerSide === "A" ? m.sideA : m.sideB)[0]!;
  const loserId = (m.winnerSide === "A" ? m.sideB : m.sideA)[0]!;
  const ra = ratings.get(winnerId) ?? ELO_INITIAL;
  const rb = ratings.get(loserId) ?? ELO_INITIAL;
  const ea = expectedScore(ra, rb);
  const eb = expectedScore(rb, ra);
  ratings.set(winnerId, ra + k * (1 - ea));
  ratings.set(loserId, rb + k * (0 - eb));
}

/**
 * Per-fecha Singles resumen: session W–L and Elo start/end for one unit ladder
 * (`game` → Elo.G, `set` → Elo.S; ladders are independent).
 * Replays only the group history *before this fecha* for start ratings, then this
 * fecha's finished matches for the end ratings. Because the baseline is bounded by
 * this fecha's start, a fecha's end Elo chains into the next fecha's start Elo.
 * `sessionMatchesOverride` replaces history rows for this session (optimistic UI).
 */
export function buildSessionSinglesResumen(
  historyMatches: Match[],
  sessionId: string,
  unit: MatchUnit,
  sessionMatchesOverride?: Match[],
  displayNameById: ReadonlyMap<PlayerId, string> = new Map(),
): SessionResumenRow[] {
  const k = ELO_K_BY_UNIT[unit];

  const sessionSource =
    sessionMatchesOverride !== undefined
      ? sessionMatchesOverride
      : historyMatches.filter((m) => m.sessionId === sessionId);

  const sessionGames = sessionSource
    .filter((m) => isCountableSingles(m, unit))
    .slice()
    .sort(compareMatches);

  if (sessionGames.length === 0) return [];

  // Chronological cutoff = this fecha's start. Optimistic rows may not carry
  // `sessionStartsAt`, so derive it from the fecha's persisted history rows.
  // When none exist yet (brand-new fecha), treat every other match as prior.
  const sessionStartMs = historyMatches
    .filter((m) => m.sessionId === sessionId && m.sessionStartsAt)
    .reduce<number | null>((min, m) => {
      const t = Date.parse(m.sessionStartsAt!);
      return min === null || t < min ? t : min;
    }, null);

  const isBeforeThisFecha = (m: Match): boolean => {
    if (sessionStartMs === null) return true;
    const t = m.sessionStartsAt ? Date.parse(m.sessionStartsAt) : 0;
    return t < sessionStartMs;
  };

  // Baseline: only matches from earlier fechas (never this one, never later ones).
  const prior = historyMatches
    .filter(
      (m) =>
        m.sessionId !== sessionId &&
        isCountableSingles(m, unit) &&
        isBeforeThisFecha(m),
    )
    .slice()
    .sort(compareMatches);

  const ratings = new Map<PlayerId, number>();
  for (const m of prior) applyElo(ratings, m, k);

  const stats = new Map<
    PlayerId,
    { wins: number; losses: number; eloStart: number }
  >();

  const ensure = (id: PlayerId) => {
    let row = stats.get(id);
    if (!row) {
      row = {
        wins: 0,
        losses: 0,
        eloStart: Math.round(ratings.get(id) ?? ELO_INITIAL),
      };
      stats.set(id, row);
    }
    return row;
  };

  for (const m of sessionGames) {
    const winnerId = (m.winnerSide === "A" ? m.sideA : m.sideB)[0]!;
    const loserId = (m.winnerSide === "A" ? m.sideB : m.sideA)[0]!;
    ensure(winnerId);
    ensure(loserId);
    applyElo(ratings, m, k);
    const w = stats.get(winnerId)!;
    const l = stats.get(loserId)!;
    w.wins += 1;
    l.losses += 1;
  }

  const nameOf = (id: PlayerId) => displayNameById.get(id) ?? id;

  return [...stats.entries()]
    .map(([playerId, row]) => ({
      playerId,
      wins: row.wins,
      losses: row.losses,
      eloStart: row.eloStart,
      eloEnd: Math.round(ratings.get(playerId) ?? ELO_INITIAL),
    }))
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.eloEnd !== a.eloEnd) return b.eloEnd - a.eloEnd;
      const byName = nameOf(a.playerId).localeCompare(nameOf(b.playerId), "es", {
        sensitivity: "base",
      });
      if (byName !== 0) return byName;
      return a.playerId.localeCompare(b.playerId);
    });
}

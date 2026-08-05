import type {
  AttendanceStatus,
  Match,
  PlayerId,
  SessionStatus,
} from "../domain/types";
import {
  appCalendarDayKey,
  appZonedParts,
  fromAppZonedDateTime,
} from "../timezone";
import { ELO_INITIAL, ELO_K_BY_UNIT, buildEloRanking } from "./elo";
import { compareMatches } from "./matchOrder";

const SERVER_STATS_MIN_SAMPLE = 10;
const GAME_K = ELO_K_BY_UNIT.game;

export type EloHistoryPoint = { at: string; elo: number };

export type EloHistoryRange = "month" | "30d" | "all";

export type PlayerStatsSessionInput = {
  id: string;
  startsAt: string;
  status: SessionStatus;
  allowedUserIds: string[];
};

export type PlayerStatsAttendanceInput = {
  sessionId: string;
  playerId: PlayerId;
  status: AttendanceStatus;
};

export type PlayerGameStats = {
  playerId: PlayerId;
  currentElo: number;
  /** 1-based ladder position; null if not on the Games ladder. */
  rank: number | null;
  wins: number;
  losses: number;
  played: number;
  /** null when played === 0 */
  winRate: number | null;
  eloMax: number;
  eloHistory: EloHistoryPoint[];
  longestWinStreak: number;
  serverStats: {
    sampleSize: number;
    asServerWinRate: number;
    asReturnerWinRate: number;
  } | null;
  attendance: {
    going: number;
    eligible: number;
    /** null when eligible === 0 */
    rate: number | null;
  };
  maxEloGainInSession: {
    sessionId: string;
    sessionStartsAt: string;
    delta: number;
  } | null;
  last3Trend: Array<{
    sessionId: string;
    sessionStartsAt: string;
    eloDelta: number;
    wins: number;
    losses: number;
  }>;
  topRival: {
    playerId: PlayerId;
    displayName: string;
    played: number;
    wins: number;
    losses: number;
  } | null;
};

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

function isCountableGame(m: Match): boolean {
  if (m.format !== "singles" || m.unit !== "game") return false;
  if (m.deletedAt) return false;
  if (m.winnerSide !== "A" && m.winnerSide !== "B") return false;
  const winnerId = (m.winnerSide === "A" ? m.sideA : m.sideB)[0];
  const loserId = (m.winnerSide === "A" ? m.sideB : m.sideA)[0];
  return Boolean(winnerId && loserId && winnerId !== loserId);
}

function playerInMatch(m: Match, playerId: PlayerId): boolean {
  return m.sideA[0] === playerId || m.sideB[0] === playerId;
}

function opponentOf(m: Match, playerId: PlayerId): PlayerId | null {
  if (m.sideA[0] === playerId) return m.sideB[0] ?? null;
  if (m.sideB[0] === playerId) return m.sideA[0] ?? null;
  return null;
}

function matchAt(m: Match): string {
  return m.createdAt ?? m.sessionStartsAt ?? "";
}

function rangeStartMs(range: EloHistoryRange, now: Date): number | null {
  if (range === "all") return null;
  if (range === "30d") {
    return now.getTime() - 30 * 24 * 60 * 60 * 1000;
  }
  const p = appZonedParts(now);
  return fromAppZonedDateTime(p.year, p.month, 1, 0, 0, 0).getTime();
}

/**
 * Collapse per-Game Elo samples to one point per calendar day (America/Lima):
 * the Elo at the end of that day. Keeps chart readable when many Games share a fecha.
 */
export function aggregateEloHistoryByDay(
  history: EloHistoryPoint[],
): EloHistoryPoint[] {
  const lastByDay = new Map<string, EloHistoryPoint>();
  for (const p of history) {
    if (!p.at || Number.isNaN(Date.parse(p.at))) continue;
    lastByDay.set(appCalendarDayKey(p.at), p);
  }
  return [...lastByDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dayKey, p]) => {
      const [y, m, d] = dayKey.split("-").map(Number);
      // Noon Lima so the point sits on that calendar day in any UTC offset.
      const at = fromAppZonedDateTime(y!, m!, d!, 12, 0, 0).toISOString();
      return { at, elo: p.elo };
    });
}

/**
 * Filter Elo series for chart ranges. For month / 30d, prepends an anchor
 * point at the range start with the Elo immediately before the window.
 */
export function filterEloHistory(
  history: EloHistoryPoint[],
  range: EloHistoryRange,
  now: Date = new Date(),
): EloHistoryPoint[] {
  if (range === "all") return history.slice();
  const startMs = rangeStartMs(range, now);
  if (startMs === null) return history.slice();

  let anchorElo = ELO_INITIAL;
  const inRange: EloHistoryPoint[] = [];
  for (const p of history) {
    const t = Date.parse(p.at);
    if (Number.isNaN(t)) continue;
    if (t < startMs) {
      anchorElo = p.elo;
    } else {
      inRange.push(p);
    }
  }
  if (inRange.length === 0) return [];
  return [{ at: new Date(startMs).toISOString(), elo: anchorElo }, ...inRange];
}

/**
 * Chart-ready series: filter by range, then one point per day (end-of-day Elo).
 * If only one day remains, prepend Elo at the range start (or 1000) so the
 * line has two points.
 */
export function buildEloHistoryForChart(
  history: EloHistoryPoint[],
  range: EloHistoryRange,
  now: Date = new Date(),
): EloHistoryPoint[] {
  const filtered = filterEloHistory(history, range, now);
  const daily = aggregateEloHistoryByDay(filtered);
  if (daily.length >= 2) return daily;
  if (daily.length === 1) {
    const only = daily[0]!;
    const startMs = rangeStartMs(range, now);
    const anchorAt =
      startMs != null
        ? new Date(startMs).toISOString()
        : new Date(Date.parse(only.at) - 24 * 60 * 60 * 1000).toISOString();
    const prior = filtered[0];
    const anchorElo =
      prior && Date.parse(prior.at) < Date.parse(only.at)
        ? prior.elo
        : ELO_INITIAL;
    if (appCalendarDayKey(anchorAt) === appCalendarDayKey(only.at)) {
      return daily;
    }
    return [{ at: anchorAt, elo: anchorElo }, only];
  }
  return [];
}

type SessionPlay = {
  sessionId: string;
  sessionStartsAt: string;
  eloStart: number;
  eloEnd: number;
  wins: number;
  losses: number;
};

export function buildPlayerGameStats(input: {
  playerId: PlayerId;
  matches: Match[];
  memberIds: PlayerId[];
  displayNameById: ReadonlyMap<PlayerId, string>;
  joinedAt: string;
  sessions: PlayerStatsSessionInput[];
  attendances: PlayerStatsAttendanceInput[];
  now?: Date;
}): PlayerGameStats {
  const {
    playerId,
    matches,
    memberIds,
    displayNameById,
    joinedAt,
    sessions,
    attendances,
  } = input;
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  const joinedMs = Date.parse(joinedAt);

  const ranking = buildEloRanking(matches, "game", memberIds, displayNameById);
  const rankIndex = ranking.findIndex((r) => r.playerId === playerId);
  const rankRow = rankIndex >= 0 ? ranking[rankIndex]! : null;

  const games = matches.filter(isCountableGame).slice().sort(compareMatches);

  const ratings = new Map<PlayerId, number>();
  const ratingOf = (id: PlayerId) => ratings.get(id) ?? ELO_INITIAL;

  let wins = 0;
  let losses = 0;
  let eloMax = ELO_INITIAL;
  let currentStreak = 0;
  let longestWinStreak = 0;
  const eloHistory: EloHistoryPoint[] = [];
  const rivals = new Map<
    PlayerId,
    { played: number; wins: number; losses: number }
  >();
  let asServerWins = 0;
  let asServerPlayed = 0;
  let asReturnerWins = 0;
  let asReturnerPlayed = 0;
  const sessionPlay = new Map<string, SessionPlay>();

  for (const m of games) {
    const winnerId = (m.winnerSide === "A" ? m.sideA : m.sideB)[0]!;
    const loserId = (m.winnerSide === "A" ? m.sideB : m.sideA)[0]!;
    const involves = playerInMatch(m, playerId);

    if (involves) {
      let sp = sessionPlay.get(m.sessionId);
      if (!sp) {
        sp = {
          sessionId: m.sessionId,
          sessionStartsAt: m.sessionStartsAt ?? matchAt(m),
          eloStart: Math.round(ratingOf(playerId)),
          eloEnd: Math.round(ratingOf(playerId)),
          wins: 0,
          losses: 0,
        };
        sessionPlay.set(m.sessionId, sp);
      }
    }

    const ra = ratingOf(winnerId);
    const rb = ratingOf(loserId);
    const ea = expectedScore(ra, rb);
    const eb = expectedScore(rb, ra);
    const nextA = ra + GAME_K * (1 - ea);
    const nextB = rb + GAME_K * (0 - eb);
    ratings.set(winnerId, nextA);
    ratings.set(loserId, nextB);

    if (!involves) continue;

    const won = winnerId === playerId;
    const rounded = Math.round(ratingOf(playerId));
    eloHistory.push({ at: matchAt(m), elo: rounded });
    if (rounded > eloMax) eloMax = rounded;

    if (won) {
      wins += 1;
      currentStreak += 1;
      if (currentStreak > longestWinStreak) longestWinStreak = currentStreak;
    } else {
      losses += 1;
      currentStreak = 0;
    }

    const opp = opponentOf(m, playerId);
    if (opp) {
      let r = rivals.get(opp);
      if (!r) {
        r = { played: 0, wins: 0, losses: 0 };
        rivals.set(opp, r);
      }
      r.played += 1;
      if (won) r.wins += 1;
      else r.losses += 1;
    }

    if (m.serverSide === "A" || m.serverSide === "B") {
      const serverId = (m.serverSide === "A" ? m.sideA : m.sideB)[0];
      if (serverId === playerId) {
        asServerPlayed += 1;
        if (won) asServerWins += 1;
      } else {
        asReturnerPlayed += 1;
        if (won) asReturnerWins += 1;
      }
    }

    const sp = sessionPlay.get(m.sessionId)!;
    sp.eloEnd = rounded;
    if (won) sp.wins += 1;
    else sp.losses += 1;
  }

  const played = wins + losses;
  const currentElo = rankRow?.points ?? Math.round(ratingOf(playerId));
  if (played === 0) {
    eloMax = currentElo;
  }

  const sampleSize = asServerPlayed + asReturnerPlayed;
  const serverStats =
    sampleSize >= SERVER_STATS_MIN_SAMPLE
      ? {
          sampleSize,
          asServerWinRate:
            asServerPlayed > 0 ? asServerWins / asServerPlayed : 0,
          asReturnerWinRate:
            asReturnerPlayed > 0 ? asReturnerWins / asReturnerPlayed : 0,
        }
      : null;

  let topRival: PlayerGameStats["topRival"] = null;
  for (const [oppId, r] of rivals) {
    const candidate = {
      playerId: oppId,
      displayName: displayNameById.get(oppId) ?? oppId,
      played: r.played,
      wins: r.wins,
      losses: r.losses,
    };
    if (!topRival) {
      topRival = candidate;
      continue;
    }
    if (candidate.played > topRival.played) {
      topRival = candidate;
      continue;
    }
    if (candidate.played < topRival.played) continue;
    const byName = candidate.displayName.localeCompare(
      topRival.displayName,
      "es",
      { sensitivity: "base" },
    );
    if (byName < 0) topRival = candidate;
  }

  let maxEloGainInSession: PlayerGameStats["maxEloGainInSession"] = null;
  for (const sp of sessionPlay.values()) {
    const delta = sp.eloEnd - sp.eloStart;
    if (
      !maxEloGainInSession ||
      delta > maxEloGainInSession.delta ||
      (delta === maxEloGainInSession.delta &&
        sp.sessionStartsAt > maxEloGainInSession.sessionStartsAt)
    ) {
      maxEloGainInSession = {
        sessionId: sp.sessionId,
        sessionStartsAt: sp.sessionStartsAt,
        delta,
      };
    }
  }
  // Only surface a "max gain" when there was a positive peak; if all negative,
  // still report the least-bad (max) delta so the sheet has a number.
  // Plan: "mayor cantidad de puntos Elo ganados" — null when no session play
  // or when the best delta is ≤ 0.
  if (maxEloGainInSession && maxEloGainInSession.delta <= 0) {
    maxEloGainInSession = null;
  }

  const attendanceBySession = new Map<string, AttendanceStatus>();
  for (const a of attendances) {
    if (a.playerId !== playerId) continue;
    attendanceBySession.set(a.sessionId, a.status);
  }

  let eligible = 0;
  let going = 0;
  const goingSessions: PlayerStatsSessionInput[] = [];

  for (const s of sessions) {
    const startMs = Date.parse(s.startsAt);
    if (Number.isNaN(startMs) || startMs >= nowMs) continue;
    if (s.status === "cancelled") continue;
    if (!Number.isNaN(joinedMs) && startMs < joinedMs) continue;
    const allowed = s.allowedUserIds ?? [];
    if (allowed.length > 0 && !allowed.includes(playerId)) continue;

    eligible += 1;
    if (attendanceBySession.get(s.id) === "going") {
      going += 1;
      goingSessions.push(s);
    }
  }

  goingSessions.sort(
    (a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt),
  );
  const last3Trend = goingSessions.slice(0, 3).map((s) => {
    const sp = sessionPlay.get(s.id);
    return {
      sessionId: s.id,
      sessionStartsAt: s.startsAt,
      eloDelta: sp ? sp.eloEnd - sp.eloStart : 0,
      wins: sp?.wins ?? 0,
      losses: sp?.losses ?? 0,
    };
  });

  return {
    playerId,
    currentElo,
    rank: rankIndex >= 0 ? rankIndex + 1 : null,
    wins,
    losses,
    played,
    winRate: played > 0 ? wins / played : null,
    eloMax,
    eloHistory,
    longestWinStreak,
    serverStats,
    attendance: {
      going,
      eligible,
      rate: eligible > 0 ? going / eligible : null,
    },
    maxEloGainInSession,
    last3Trend,
    topRival,
  };
}

import type {
  AttendanceStatus,
  Match,
  PlayerId,
  SessionStatus,
} from "../domain/types";
import { appZonedParts, fromAppZonedDateTime } from "../timezone";
import { ELO_INITIAL, ELO_K_BY_UNIT, buildEloRanking } from "./elo";
import { compareMatches } from "./matchOrder";

const SERVER_STATS_MIN_SAMPLE = 10;
const GAME_K = ELO_K_BY_UNIT.game;

export type EloHistoryPoint = {
  at: string;
  elo: number;
  /** Synthetic index-0 point before the first Fecha / first Game. */
  isStart?: boolean;
  /** 1-based Game index within a Fecha (Fecha-scoped chart). */
  gameIndex?: number;
  /** Explicit axis / tooltip label when set. */
  label?: string;
};

/** Stats for one player scoped to a single Fecha (Games only). */
export type PlayerFechaGameStats = {
  playerId: PlayerId;
  sessionId: string;
  eloStart: number;
  eloEnd: number;
  wins: number;
  losses: number;
  played: number;
  winRate: number | null;
  eloMax: number;
  /** Inicio (eloStart) + one point after every Game of the Fecha. */
  eloHistory: EloHistoryPoint[];
  longestWinStreak: number;
  /** EloEnd − eloStart for this Fecha. */
  eloDelta: number;
  /** Biggest single-Game Elo gain while playing (≥ 1). Null if none positive. */
  maxEloGainInGame: number | null;
  serverStats: {
    sampleSize: number;
    asServerWinRate: number;
    asReturnerWinRate: number;
  } | null;
  /** Games the player played / total finished Games in the Fecha. */
  participation: {
    played: number;
    totalGames: number;
    rate: number | null;
  };
  topRival: {
    playerId: PlayerId;
    displayName: string;
    played: number;
    wins: number;
    losses: number;
  } | null;
};

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

function applyGameElo(ratings: Map<PlayerId, number>, m: Match): void {
  const winnerId = (m.winnerSide === "A" ? m.sideA : m.sideB)[0]!;
  const loserId = (m.winnerSide === "A" ? m.sideB : m.sideA)[0]!;
  const ra = ratings.get(winnerId) ?? ELO_INITIAL;
  const rb = ratings.get(loserId) ?? ELO_INITIAL;
  const ea = expectedScore(ra, rb);
  const eb = expectedScore(rb, ra);
  ratings.set(winnerId, ra + GAME_K * (1 - ea));
  ratings.set(loserId, rb + GAME_K * (0 - eb));
}

/**
 * Elo series shared across players: index 0 = start at 1000, then one sample
 * per past non-cancelled Fecha (end-of-fecha Elo). Elo carries forward when
 * the player did not play that fecha. Games from skipped (e.g. cancelled)
 * fechas are still applied for correctness.
 */
export function buildGroupFechaEloHistory(
  playerId: PlayerId,
  matches: Match[],
  sessions: PlayerStatsSessionInput[],
  now: Date = new Date(),
): EloHistoryPoint[] {
  const nowMs = now.getTime();
  const plotSessions = sessions
    .filter((s) => {
      const t = Date.parse(s.startsAt);
      return !Number.isNaN(t) && t < nowMs && s.status !== "cancelled";
    })
    .slice()
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));

  if (plotSessions.length === 0) return [];

  const games = matches.filter(isCountableGame).slice().sort(compareMatches);
  const ratings = new Map<PlayerId, number>();
  let gi = 0;
  const fechaPoints: EloHistoryPoint[] = [];

  for (const s of plotSessions) {
    const sStart = Date.parse(s.startsAt);
    while (gi < games.length) {
      const g = games[gi]!;
      const gStart = g.sessionStartsAt ? Date.parse(g.sessionStartsAt) : 0;
      if (g.sessionId === s.id || gStart < sStart) {
        applyGameElo(ratings, g);
        gi += 1;
      } else {
        break;
      }
    }
    fechaPoints.push({
      at: s.startsAt,
      elo: Math.round(ratings.get(playerId) ?? ELO_INITIAL),
    });
  }

  const firstStart = Date.parse(plotSessions[0]!.startsAt);
  const startAt = new Date(firstStart - 1000).toISOString();
  return [
    { at: startAt, elo: ELO_INITIAL, isStart: true },
    ...fechaPoints,
  ];
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
  let anchorIsStart = true;
  const inRange: EloHistoryPoint[] = [];
  for (const p of history) {
    const t = Date.parse(p.at);
    if (Number.isNaN(t)) continue;
    if (t < startMs) {
      anchorElo = p.elo;
      anchorIsStart = Boolean(p.isStart);
    } else {
      inRange.push(p);
    }
  }
  if (inRange.length === 0) return [];
  return [
    {
      at: new Date(startMs).toISOString(),
      elo: anchorElo,
      ...(anchorIsStart ? { isStart: true as const } : {}),
    },
    ...inRange,
  ];
}

/**
 * Chart-ready series from group-fecha history: filter by range. If only one
 * Fecha remains, prepend an anchor so the line has two points.
 */
export function buildEloHistoryForChart(
  history: EloHistoryPoint[],
  range: EloHistoryRange,
  now: Date = new Date(),
): EloHistoryPoint[] {
  const filtered = filterEloHistory(history, range, now);
  if (filtered.length >= 2) return filtered;
  if (filtered.length === 1) {
    const only = filtered[0]!;
    const startMs = rangeStartMs(range, now);
    const anchorAt =
      startMs != null
        ? new Date(startMs).toISOString()
        : new Date(Date.parse(only.at) - 24 * 60 * 60 * 1000).toISOString();
    if (anchorAt === only.at) return filtered;
    return [{ at: anchorAt, elo: ELO_INITIAL }, only];
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

    applyGameElo(ratings, m);

    if (!involves) continue;

    const won = winnerId === playerId;
    const rounded = Math.round(ratingOf(playerId));
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

  const eloHistory = buildGroupFechaEloHistory(
    playerId,
    matches,
    sessions,
    now,
  );
  for (const p of eloHistory) {
    if (p.elo > eloMax) eloMax = p.elo;
  }

  const played = wins + losses;
  const currentElo = rankRow?.points ?? Math.round(ratingOf(playerId));
  if (played === 0) {
    eloMax = Math.max(currentElo, ...eloHistory.map((p) => p.elo), ELO_INITIAL);
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

/**
 * Games-only stats for one player in one Fecha. Chart X-axis = every finished
 * Game of the Fecha (same for all players); Elo carries when they sit a Game out.
 * `sessionMatchesOverride` mirrors sessionResumen optimistic UI.
 */
export function buildPlayerFechaGameStats(input: {
  playerId: PlayerId;
  sessionId: string;
  historyMatches: Match[];
  displayNameById: ReadonlyMap<PlayerId, string>;
  sessionMatchesOverride?: Match[];
}): PlayerFechaGameStats {
  const {
    playerId,
    sessionId,
    historyMatches,
    displayNameById,
    sessionMatchesOverride,
  } = input;

  const sessionSource =
    sessionMatchesOverride !== undefined
      ? sessionMatchesOverride
      : historyMatches.filter((m) => m.sessionId === sessionId);

  const sessionGames = sessionSource
    .filter(isCountableGame)
    .slice()
    .sort(compareMatches);

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

  const prior = historyMatches
    .filter(
      (m) =>
        m.sessionId !== sessionId &&
        isCountableGame(m) &&
        isBeforeThisFecha(m),
    )
    .slice()
    .sort(compareMatches);

  const ratings = new Map<PlayerId, number>();
  for (const m of prior) applyGameElo(ratings, m);

  const eloStart = Math.round(ratings.get(playerId) ?? ELO_INITIAL);
  let eloMax = eloStart;
  let wins = 0;
  let losses = 0;
  let currentStreak = 0;
  let longestWinStreak = 0;
  let maxEloGainInGame: number | null = null;
  let asServerWins = 0;
  let asServerPlayed = 0;
  let asReturnerWins = 0;
  let asReturnerPlayed = 0;
  const rivals = new Map<
    PlayerId,
    { played: number; wins: number; losses: number }
  >();

  const startAt =
    sessionStartMs != null
      ? new Date(sessionStartMs - 1000).toISOString()
      : sessionGames[0]
        ? matchAt(sessionGames[0])
        : new Date(0).toISOString();

  const eloHistory: EloHistoryPoint[] = [
    {
      at: startAt,
      elo: eloStart,
      isStart: true,
      label: "Inicio",
    },
  ];

  for (let i = 0; i < sessionGames.length; i++) {
    const m = sessionGames[i]!;
    const involves = playerInMatch(m, playerId);
    const eloBefore = Math.round(ratings.get(playerId) ?? ELO_INITIAL);

    applyGameElo(ratings, m);
    const eloAfter = Math.round(ratings.get(playerId) ?? ELO_INITIAL);
    if (eloAfter > eloMax) eloMax = eloAfter;

    eloHistory.push({
      at: matchAt(m) || startAt,
      elo: eloAfter,
      gameIndex: i + 1,
      label: `G${i + 1}`,
    });

    if (!involves) continue;

    const gain = eloAfter - eloBefore;
    if (gain > 0 && (maxEloGainInGame == null || gain > maxEloGainInGame)) {
      maxEloGainInGame = gain;
    }

    const won =
      (m.winnerSide === "A" ? m.sideA[0] : m.sideB[0]) === playerId;
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
  }

  const played = wins + losses;
  const eloEnd = Math.round(ratings.get(playerId) ?? ELO_INITIAL);
  const totalGames = sessionGames.length;

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

  let topRival: PlayerFechaGameStats["topRival"] = null;
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

  return {
    playerId,
    sessionId,
    eloStart,
    eloEnd,
    wins,
    losses,
    played,
    winRate: played > 0 ? wins / played : null,
    eloMax,
    eloHistory,
    longestWinStreak,
    eloDelta: eloEnd - eloStart,
    maxEloGainInGame,
    serverStats,
    participation: {
      played,
      totalGames,
      rate: totalGames > 0 ? played / totalGames : null,
    },
    topRival,
  };
}

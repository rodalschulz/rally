import { describe, expect, it } from "vitest";
import type { Match } from "@/lib/domain/types";
import { ELO_INITIAL, ELO_K_BY_UNIT } from "./elo";
import {
  aggregateEloHistoryByDay,
  buildEloHistoryForChart,
  buildPlayerGameStats,
  filterEloHistory,
  type PlayerStatsAttendanceInput,
  type PlayerStatsSessionInput,
} from "./playerStats";

const k = ELO_K_BY_UNIT.game;
const winDelta = Math.round(ELO_INITIAL + k * 0.5) - ELO_INITIAL; // +12

function game(
  partial: Partial<Match> & Pick<Match, "id" | "winnerSide" | "sessionId">,
): Match {
  return {
    format: "singles",
    unit: "game",
    sideA: ["a"],
    sideB: ["b"],
    score: "1-0",
    sessionStartsAt: "2026-01-01T17:00:00.000Z",
    createdAt: "2026-01-01T18:00:00.000Z",
    ...partial,
  };
}

function stats(
  overrides: Partial<Parameters<typeof buildPlayerGameStats>[0]> = {},
) {
  return buildPlayerGameStats({
    playerId: "a",
    matches: [],
    memberIds: ["a", "b", "c"],
    displayNameById: new Map([
      ["a", "Ana"],
      ["b", "Bruno"],
      ["c", "Carla"],
    ]),
    joinedAt: "2025-01-01T00:00:00.000Z",
    sessions: [],
    attendances: [],
    now: new Date("2026-08-01T12:00:00.000Z"),
    ...overrides,
  });
}

describe("buildPlayerGameStats", () => {
  it("reports win% and elo max after games", () => {
    const matches: Match[] = [
      game({ id: "1", sessionId: "s1", winnerSide: "A" }),
      game({
        id: "2",
        sessionId: "s1",
        winnerSide: "B",
        createdAt: "2026-01-01T18:05:00.000Z",
      }),
      game({
        id: "3",
        sessionId: "s1",
        winnerSide: "A",
        createdAt: "2026-01-01T18:10:00.000Z",
      }),
    ];
    const s = stats({ matches });
    expect(s.played).toBe(3);
    expect(s.wins).toBe(2);
    expect(s.losses).toBe(1);
    expect(s.winRate).toBeCloseTo(2 / 3);
    expect(s.eloMax).toBeGreaterThanOrEqual(ELO_INITIAL);
    expect(s.eloHistory).toHaveLength(3);
    expect(s.rank).toBe(1);
  });

  it("counts win streak across fechas", () => {
    // Fecha 1: A loses first, then wins last two.
    // Fecha 2: A wins first two → streak of 4 across boundary.
    const matches: Match[] = [
      game({
        id: "1",
        sessionId: "s1",
        winnerSide: "B",
        sessionStartsAt: "2026-01-01T17:00:00.000Z",
        createdAt: "2026-01-01T18:00:00.000Z",
      }),
      game({
        id: "2",
        sessionId: "s1",
        winnerSide: "A",
        sessionStartsAt: "2026-01-01T17:00:00.000Z",
        createdAt: "2026-01-01T18:05:00.000Z",
      }),
      game({
        id: "3",
        sessionId: "s1",
        winnerSide: "A",
        sessionStartsAt: "2026-01-01T17:00:00.000Z",
        createdAt: "2026-01-01T18:10:00.000Z",
      }),
      game({
        id: "4",
        sessionId: "s2",
        winnerSide: "A",
        sessionStartsAt: "2026-01-08T17:00:00.000Z",
        createdAt: "2026-01-08T18:00:00.000Z",
      }),
      game({
        id: "5",
        sessionId: "s2",
        winnerSide: "A",
        sessionStartsAt: "2026-01-08T17:00:00.000Z",
        createdAt: "2026-01-08T18:05:00.000Z",
      }),
    ];
    const s = stats({ matches });
    expect(s.longestWinStreak).toBe(4);
  });

  it("hides server stats below 10 games with server recorded", () => {
    const matches: Match[] = Array.from({ length: 9 }, (_, i) =>
      game({
        id: `g${i}`,
        sessionId: "s1",
        winnerSide: "A",
        serverSide: "A",
        createdAt: `2026-01-01T18:${String(i).padStart(2, "0")}:00.000Z`,
      }),
    );
    expect(stats({ matches }).serverStats).toBeNull();
  });

  it("shows server win% when sample ≥ 10", () => {
    // 10 as server (6 wins), 0 as returner → still sample 10
    const matches: Match[] = Array.from({ length: 10 }, (_, i) =>
      game({
        id: `g${i}`,
        sessionId: "s1",
        winnerSide: i < 6 ? "A" : "B",
        serverSide: "A",
        createdAt: `2026-01-01T18:${String(i).padStart(2, "0")}:00.000Z`,
      }),
    );
    const s = stats({ matches });
    expect(s.serverStats).toEqual({
      sampleSize: 10,
      asServerWinRate: 0.6,
      asReturnerWinRate: 0,
    });
  });

  it("computes attendance with joinedAt and allowedUserIds", () => {
    const sessions: PlayerStatsSessionInput[] = [
      {
        id: "before-join",
        startsAt: "2025-06-01T17:00:00.000Z",
        status: "completed",
        allowedUserIds: [],
      },
      {
        id: "restricted",
        startsAt: "2026-02-01T17:00:00.000Z",
        status: "completed",
        allowedUserIds: ["b", "c"],
      },
      {
        id: "ok1",
        startsAt: "2026-03-01T17:00:00.000Z",
        status: "completed",
        allowedUserIds: [],
      },
      {
        id: "ok2",
        startsAt: "2026-04-01T17:00:00.000Z",
        status: "completed",
        allowedUserIds: ["a"],
      },
      {
        id: "cancelled",
        startsAt: "2026-05-01T17:00:00.000Z",
        status: "cancelled",
        allowedUserIds: [],
      },
      {
        id: "future",
        startsAt: "2026-12-01T17:00:00.000Z",
        status: "scheduled",
        allowedUserIds: [],
      },
    ];
    const attendances: PlayerStatsAttendanceInput[] = [
      { sessionId: "ok1", playerId: "a", status: "going" },
      { sessionId: "ok2", playerId: "a", status: "not_going" },
    ];
    const s = stats({
      joinedAt: "2026-01-15T00:00:00.000Z",
      sessions,
      attendances,
    });
    expect(s.attendance).toEqual({ going: 1, eligible: 2, rate: 0.5 });
  });

  it("reports max Elo gain in a fecha", () => {
    const matches: Match[] = [
      game({
        id: "1",
        sessionId: "s1",
        winnerSide: "A",
        sessionStartsAt: "2026-01-01T17:00:00.000Z",
        createdAt: "2026-01-01T18:00:00.000Z",
      }),
      game({
        id: "2",
        sessionId: "s1",
        winnerSide: "A",
        sessionStartsAt: "2026-01-01T17:00:00.000Z",
        createdAt: "2026-01-01T18:05:00.000Z",
      }),
      game({
        id: "3",
        sessionId: "s2",
        winnerSide: "B",
        sessionStartsAt: "2026-01-08T17:00:00.000Z",
        createdAt: "2026-01-08T18:00:00.000Z",
      }),
    ];
    const s = stats({ matches });
    expect(s.maxEloGainInSession?.sessionId).toBe("s1");
    expect(s.maxEloGainInSession?.delta).toBeGreaterThan(0);
    // Two equal-strength wins from 1000: first +12, second less, both positive.
    expect(s.maxEloGainInSession?.delta).toBeGreaterThanOrEqual(winDelta);
  });

  it("picks the most-played rival (name tie-break)", () => {
    const matches: Match[] = [
      game({ id: "1", sessionId: "s1", sideA: ["a"], sideB: ["b"], winnerSide: "A" }),
      game({
        id: "2",
        sessionId: "s1",
        sideA: ["a"],
        sideB: ["c"],
        winnerSide: "A",
        createdAt: "2026-01-01T18:05:00.000Z",
      }),
      game({
        id: "3",
        sessionId: "s1",
        sideA: ["a"],
        sideB: ["b"],
        winnerSide: "B",
        createdAt: "2026-01-01T18:10:00.000Z",
      }),
    ];
    const s = stats({ matches });
    expect(s.topRival).toMatchObject({
      playerId: "b",
      displayName: "Bruno",
      played: 2,
      wins: 1,
      losses: 1,
    });
  });

  it("builds last-3 attended trend with elo deltas", () => {
    const sessions: PlayerStatsSessionInput[] = [
      {
        id: "s1",
        startsAt: "2026-01-01T17:00:00.000Z",
        status: "completed",
        allowedUserIds: [],
      },
      {
        id: "s2",
        startsAt: "2026-02-01T17:00:00.000Z",
        status: "completed",
        allowedUserIds: [],
      },
      {
        id: "s3",
        startsAt: "2026-03-01T17:00:00.000Z",
        status: "completed",
        allowedUserIds: [],
      },
      {
        id: "s4",
        startsAt: "2026-04-01T17:00:00.000Z",
        status: "completed",
        allowedUserIds: [],
      },
    ];
    const attendances: PlayerStatsAttendanceInput[] = sessions.map((s) => ({
      sessionId: s.id,
      playerId: "a",
      status: "going" as const,
    }));
    const matches: Match[] = [
      game({
        id: "1",
        sessionId: "s2",
        winnerSide: "A",
        sessionStartsAt: "2026-02-01T17:00:00.000Z",
        createdAt: "2026-02-01T18:00:00.000Z",
      }),
      game({
        id: "2",
        sessionId: "s4",
        winnerSide: "B",
        sessionStartsAt: "2026-04-01T17:00:00.000Z",
        createdAt: "2026-04-01T18:00:00.000Z",
      }),
    ];
    const s = stats({ matches, sessions, attendances });
    expect(s.last3Trend.map((t) => t.sessionId)).toEqual(["s4", "s3", "s2"]);
    expect(s.last3Trend[0]!.eloDelta).toBeLessThan(0);
    expect(s.last3Trend[1]).toMatchObject({
      eloDelta: 0,
      wins: 0,
      losses: 0,
    });
    expect(s.last3Trend[2]!.eloDelta).toBeGreaterThan(0);
  });

  it("opens with empty games (asistencia only)", () => {
    const sessions: PlayerStatsSessionInput[] = [
      {
        id: "s1",
        startsAt: "2026-03-01T17:00:00.000Z",
        status: "completed",
        allowedUserIds: [],
      },
    ];
    const s = stats({
      sessions,
      attendances: [
        { sessionId: "s1", playerId: "a", status: "going" },
      ],
    });
    expect(s.played).toBe(0);
    expect(s.winRate).toBeNull();
    expect(s.currentElo).toBe(ELO_INITIAL);
    expect(s.attendance.going).toBe(1);
    expect(s.maxEloGainInSession).toBeNull();
    expect(s.topRival).toBeNull();
  });
});

describe("filterEloHistory", () => {
  const history = [
    { at: "2026-01-10T12:00:00.000Z", elo: 1012 },
    { at: "2026-02-15T12:00:00.000Z", elo: 1020 },
    { at: "2026-03-20T12:00:00.000Z", elo: 1008 },
  ];

  it("returns full series for all", () => {
    expect(filterEloHistory(history, "all")).toEqual(history);
  });

  it("anchors month range in America/Lima", () => {
    // 2026-03-15 12:00 Lima = still March
    const now = new Date("2026-03-15T17:00:00.000Z");
    const filtered = filterEloHistory(history, "month", now);
    expect(filtered[0]!.elo).toBe(1020); // Elo before March points
    expect(filtered.slice(1)).toEqual([history[2]]);
  });

  it("filters last 30 days with anchor", () => {
    const now = new Date("2026-03-25T12:00:00.000Z");
    const filtered = filterEloHistory(history, "30d", now);
    expect(filtered.length).toBeGreaterThanOrEqual(2);
    expect(filtered[filtered.length - 1]).toEqual(history[2]);
  });

  it("returns empty when no points in range", () => {
    const now = new Date("2026-08-01T12:00:00.000Z");
    expect(filterEloHistory(history, "month", now)).toEqual([]);
  });
});

describe("aggregateEloHistoryByDay", () => {
  it("keeps the last Elo of each America/Lima calendar day", () => {
    // 18:00 and 19:00 UTC = 13:00 and 14:00 Lima on 2026-01-10
    const daily = aggregateEloHistoryByDay([
      { at: "2026-01-10T18:00:00.000Z", elo: 1010 },
      { at: "2026-01-10T19:00:00.000Z", elo: 1022 },
      { at: "2026-01-11T18:00:00.000Z", elo: 1030 },
    ]);
    expect(daily).toHaveLength(2);
    expect(daily[0]!.elo).toBe(1022);
    expect(daily[1]!.elo).toBe(1030);
  });
});

describe("buildEloHistoryForChart", () => {
  it("aggregates to daily points for the chart", () => {
    const series = buildEloHistoryForChart(
      [
        { at: "2026-01-10T18:00:00.000Z", elo: 1010 },
        { at: "2026-01-10T19:00:00.000Z", elo: 1022 },
        { at: "2026-01-12T18:00:00.000Z", elo: 1035 },
      ],
      "all",
    );
    expect(series).toHaveLength(2);
    expect(series.map((p) => p.elo)).toEqual([1022, 1035]);
  });
});

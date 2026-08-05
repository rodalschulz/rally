import { describe, expect, it } from "vitest";
import type { Match } from "@/lib/domain/types";
import { ELO_INITIAL, ELO_K_BY_UNIT } from "./elo";
import {
  buildEloHistoryForChart,
  buildGroupFechaEloHistory,
  buildPlayerFechaGameStats,
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
    const s = stats({
      matches,
      sessions: [
        {
          id: "s1",
          startsAt: "2026-01-01T17:00:00.000Z",
          status: "completed",
          allowedUserIds: [],
        },
      ],
    });
    expect(s.played).toBe(3);
    expect(s.wins).toBe(2);
    expect(s.losses).toBe(1);
    expect(s.winRate).toBeCloseTo(2 / 3);
    expect(s.eloMax).toBeGreaterThanOrEqual(ELO_INITIAL);
    expect(s.eloHistory).toHaveLength(2); // Inicio 1000 + 1 Fecha
    expect(s.eloHistory[0]).toMatchObject({ elo: ELO_INITIAL, isStart: true });
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

describe("buildGroupFechaEloHistory", () => {
  it("plots every past group Fecha and carries Elo when the player sat out", () => {
    const sessions: PlayerStatsSessionInput[] = [
      {
        id: "s1",
        startsAt: "2026-01-01T17:00:00.000Z",
        status: "completed",
        allowedUserIds: [],
      },
      {
        id: "s2",
        startsAt: "2026-01-08T17:00:00.000Z",
        status: "completed",
        allowedUserIds: [],
      },
      {
        id: "s3",
        startsAt: "2026-01-15T17:00:00.000Z",
        status: "completed",
        allowedUserIds: [],
      },
    ];
    // a plays s1; b vs c on s2 (a sits out); a plays s3
    const matches: Match[] = [
      game({
        id: "1",
        sessionId: "s1",
        sideA: ["a"],
        sideB: ["b"],
        winnerSide: "A",
        sessionStartsAt: "2026-01-01T17:00:00.000Z",
        createdAt: "2026-01-01T18:00:00.000Z",
      }),
      game({
        id: "2",
        sessionId: "s2",
        sideA: ["b"],
        sideB: ["c"],
        winnerSide: "A",
        sessionStartsAt: "2026-01-08T17:00:00.000Z",
        createdAt: "2026-01-08T18:00:00.000Z",
      }),
      game({
        id: "3",
        sessionId: "s3",
        sideA: ["a"],
        sideB: ["b"],
        winnerSide: "A",
        sessionStartsAt: "2026-01-15T17:00:00.000Z",
        createdAt: "2026-01-15T18:00:00.000Z",
      }),
    ];
    const now = new Date("2026-08-01T12:00:00.000Z");
    const forA = buildGroupFechaEloHistory("a", matches, sessions, now);
    const forC = buildGroupFechaEloHistory("c", matches, sessions, now);
    expect(forA.map((p) => p.at)).toEqual(forC.map((p) => p.at));
    expect(forA).toHaveLength(4); // Inicio + 3 Fechas
    expect(forA[0]).toMatchObject({ elo: ELO_INITIAL, isStart: true });
    // s2: a did not play → Elo unchanged from end of s1
    expect(forA[2]!.elo).toBe(forA[1]!.elo);
    expect(forA[3]!.elo).toBeGreaterThan(forA[2]!.elo);
  });

  it("skips cancelled and future Fechas on the axis", () => {
    const sessions: PlayerStatsSessionInput[] = [
      {
        id: "s1",
        startsAt: "2026-01-01T17:00:00.000Z",
        status: "completed",
        allowedUserIds: [],
      },
      {
        id: "cancelled",
        startsAt: "2026-01-08T17:00:00.000Z",
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
    const series = buildGroupFechaEloHistory(
      "a",
      [
        game({
          id: "1",
          sessionId: "s1",
          winnerSide: "A",
          sessionStartsAt: "2026-01-01T17:00:00.000Z",
        }),
      ],
      sessions,
      new Date("2026-08-01T12:00:00.000Z"),
    );
    expect(series).toHaveLength(2);
    expect(series[0]).toMatchObject({ elo: ELO_INITIAL, isStart: true });
    expect(series[1]!.at).toBe("2026-01-01T17:00:00.000Z");
  });
});

describe("buildEloHistoryForChart", () => {
  it("keeps start + group-fecha points for the all range", () => {
    const series = buildEloHistoryForChart(
      [
        { at: "2025-12-31T17:00:00.000Z", elo: ELO_INITIAL, isStart: true },
        { at: "2026-01-01T17:00:00.000Z", elo: 1012 },
        { at: "2026-01-08T17:00:00.000Z", elo: 1012 },
        { at: "2026-01-15T17:00:00.000Z", elo: 1035 },
      ],
      "all",
    );
    expect(series).toHaveLength(4);
    expect(series.map((p) => p.elo)).toEqual([
      ELO_INITIAL,
      1012,
      1012,
      1035,
    ]);
  });
});

describe("buildPlayerFechaGameStats", () => {
  const names = new Map([
    ["a", "Ana"],
    ["b", "Bruno"],
    ["c", "Carla"],
  ]);

  it("plots Inicio + every Game of the Fecha for all players", () => {
    const history: Match[] = [
      game({
        id: "1",
        sessionId: "s1",
        sideA: ["a"],
        sideB: ["b"],
        winnerSide: "A",
        createdAt: "2026-01-01T18:00:00.000Z",
      }),
      game({
        id: "2",
        sessionId: "s1",
        sideA: ["b"],
        sideB: ["c"],
        winnerSide: "A",
        createdAt: "2026-01-01T18:05:00.000Z",
      }),
      game({
        id: "3",
        sessionId: "s1",
        sideA: ["a"],
        sideB: ["c"],
        winnerSide: "B",
        createdAt: "2026-01-01T18:10:00.000Z",
      }),
    ];
    const forA = buildPlayerFechaGameStats({
      playerId: "a",
      sessionId: "s1",
      historyMatches: history,
      displayNameById: names,
    });
    const forC = buildPlayerFechaGameStats({
      playerId: "c",
      sessionId: "s1",
      historyMatches: history,
      displayNameById: names,
    });
    expect(forA.eloHistory).toHaveLength(4); // Inicio + 3 Games
    expect(forA.eloHistory.map((p) => p.label)).toEqual(
      forC.eloHistory.map((p) => p.label),
    );
    expect(forA.eloHistory[0]).toMatchObject({
      isStart: true,
      elo: ELO_INITIAL,
    });
    // a sits out game 2 → Elo unchanged between G1 and G2
    expect(forA.eloHistory[2]!.elo).toBe(forA.eloHistory[1]!.elo);
    expect(forA.participation).toEqual({
      played: 2,
      totalGames: 3,
      rate: 2 / 3,
    });
    expect(forA.wins).toBe(1);
    expect(forA.losses).toBe(1);
  });

  it("uses prior Fechas for Elo start", () => {
    const history: Match[] = [
      game({
        id: "prev",
        sessionId: "s0",
        winnerSide: "A",
        sessionStartsAt: "2025-12-01T17:00:00.000Z",
        createdAt: "2025-12-01T18:00:00.000Z",
      }),
      game({
        id: "now",
        sessionId: "s1",
        winnerSide: "B",
        sessionStartsAt: "2026-01-01T17:00:00.000Z",
        createdAt: "2026-01-01T18:00:00.000Z",
      }),
    ];
    const s = buildPlayerFechaGameStats({
      playerId: "a",
      sessionId: "s1",
      historyMatches: history,
      displayNameById: names,
    });
    const expectedStart = Math.round(ELO_INITIAL + k * 0.5);
    expect(s.eloStart).toBe(expectedStart);
    expect(s.eloHistory[0]!.elo).toBe(expectedStart);
    expect(s.eloEnd).toBeLessThan(s.eloStart);
  });
});

import { describe, expect, it } from "vitest";
import type { Match } from "@/lib/domain/types";
import { ELO_INITIAL, ELO_K_BY_UNIT } from "./elo";
import { buildSessionSinglesResumen } from "./sessionResumen";

function match(
  partial: Partial<Match> & Pick<Match, "id" | "winnerSide" | "sessionId">,
): Match {
  return {
    format: "singles",
    unit: "game",
    sideA: ["a"],
    sideB: ["b"],
    score: "1-0",
    sessionStartsAt: "2026-01-01T12:00:00.000Z",
    createdAt: "2026-01-01T14:00:00.000Z",
    ...partial,
  };
}

describe("buildSessionSinglesResumen", () => {
  it("returns empty when the session has no finished games", () => {
    expect(buildSessionSinglesResumen([], "s1", "game")).toEqual([]);
    expect(
      buildSessionSinglesResumen(
        [
          match({
            id: "open",
            sessionId: "s1",
            winnerSide: null,
            score: "",
          }),
          match({
            id: "del",
            sessionId: "s1",
            winnerSide: "A",
            deletedAt: "2026-01-01T15:00:00.000Z",
          }),
        ],
        "s1",
        "game",
      ),
    ).toEqual([]);
  });

  it("counts W–L and Elo for one game from 1000", () => {
    const k = ELO_K_BY_UNIT.game;
    const expectedWinner = Math.round(ELO_INITIAL + k * 0.5);
    const expectedLoser = Math.round(ELO_INITIAL - k * 0.5);
    const rows = buildSessionSinglesResumen(
      [match({ id: "g1", sessionId: "s1", winnerSide: "A" })],
      "s1",
      "game",
    );
    expect(rows).toEqual([
      {
        playerId: "a",
        wins: 1,
        losses: 0,
        eloStart: ELO_INITIAL,
        eloEnd: expectedWinner,
      },
      {
        playerId: "b",
        wins: 0,
        losses: 1,
        eloStart: ELO_INITIAL,
        eloEnd: expectedLoser,
      },
    ]);
  });

  it("uses prior history for Elo start", () => {
    const k = ELO_K_BY_UNIT.game;
    const priorWin = Math.round(ELO_INITIAL + k * 0.5);
    const priorLoss = Math.round(ELO_INITIAL - k * 0.5);

    const history: Match[] = [
      match({
        id: "prev",
        sessionId: "s0",
        winnerSide: "A",
        sessionStartsAt: "2026-01-01T12:00:00.000Z",
        createdAt: "2026-01-01T14:00:00.000Z",
      }),
      match({
        id: "now",
        sessionId: "s1",
        sideA: ["a"],
        sideB: ["b"],
        winnerSide: "B",
        sessionStartsAt: "2026-01-08T12:00:00.000Z",
        createdAt: "2026-01-08T14:00:00.000Z",
      }),
    ];

    const rows = buildSessionSinglesResumen(history, "s1", "game");
    const a = rows.find((r) => r.playerId === "a")!;
    const b = rows.find((r) => r.playerId === "b")!;

    expect(a.eloStart).toBe(priorWin);
    expect(b.eloStart).toBe(priorLoss);
    expect(a.wins).toBe(0);
    expect(a.losses).toBe(1);
    expect(b.wins).toBe(1);
    expect(b.losses).toBe(0);
    expect(b.eloEnd).toBeGreaterThan(a.eloEnd);
  });

  it("ignores En curso, deleted, sets, and doubles in the session", () => {
    const rows = buildSessionSinglesResumen(
      [
        match({
          id: "g1",
          sessionId: "s1",
          winnerSide: "A",
          createdAt: "2026-01-01T14:00:00.000Z",
        }),
        match({
          id: "open",
          sessionId: "s1",
          winnerSide: null,
          score: "",
          createdAt: "2026-01-01T14:01:00.000Z",
        }),
        match({
          id: "set1",
          sessionId: "s1",
          unit: "set",
          score: "6-4",
          winnerSide: "A",
          createdAt: "2026-01-01T14:02:00.000Z",
        }),
        match({
          id: "d1",
          sessionId: "s1",
          format: "doubles",
          sideA: ["a", "c"],
          sideB: ["b", "d"],
          winnerSide: "A",
          createdAt: "2026-01-01T14:03:00.000Z",
        }),
      ],
      "s1",
      "game",
    );
    expect(rows.map((r) => r.playerId).sort()).toEqual(["a", "b"]);
    expect(rows.find((r) => r.playerId === "a")!.wins).toBe(1);
  });

  it("uses sessionMatchesOverride instead of history session rows", () => {
    const history: Match[] = [
      match({ id: "old", sessionId: "s1", winnerSide: "A" }),
    ];
    const override: Match[] = [
      match({
        id: "new",
        sessionId: "s1",
        sideA: ["b"],
        sideB: ["a"],
        winnerSide: "A",
      }),
    ];
    const rows = buildSessionSinglesResumen(
      history,
      "s1",
      "game",
      override,
    );
    expect(rows.find((r) => r.playerId === "b")!.wins).toBe(1);
    expect(rows.find((r) => r.playerId === "a")!.losses).toBe(1);
  });

  it("does not let a later fecha leak into an earlier fecha's baseline", () => {
    // s1 (earlier): a beats b. s2 (later): a beats c.
    const history: Match[] = [
      match({
        id: "s1g1",
        sessionId: "s1",
        sideA: ["a"],
        sideB: ["b"],
        winnerSide: "A",
        sessionStartsAt: "2026-01-01T12:00:00.000Z",
        createdAt: "2026-01-01T14:00:00.000Z",
      }),
      match({
        id: "s2g1",
        sessionId: "s2",
        sideA: ["a"],
        sideB: ["c"],
        winnerSide: "A",
        sessionStartsAt: "2026-01-08T12:00:00.000Z",
        createdAt: "2026-01-08T14:00:00.000Z",
      }),
    ];

    const s1 = buildSessionSinglesResumen(history, "s1", "game");
    const aS1 = s1.find((r) => r.playerId === "a")!;
    // The earlier fecha starts from scratch — s2 must NOT raise a's start Elo.
    expect(aS1.eloStart).toBe(ELO_INITIAL);
  });

  it("chains: a fecha's end Elo equals the next fecha's start Elo", () => {
    const history: Match[] = [
      match({
        id: "s1g1",
        sessionId: "s1",
        sideA: ["a"],
        sideB: ["b"],
        winnerSide: "A",
        sessionStartsAt: "2026-01-01T12:00:00.000Z",
        createdAt: "2026-01-01T14:00:00.000Z",
      }),
      match({
        id: "s2g1",
        sessionId: "s2",
        sideA: ["a"],
        sideB: ["c"],
        winnerSide: "A",
        sessionStartsAt: "2026-01-08T12:00:00.000Z",
        createdAt: "2026-01-08T14:00:00.000Z",
      }),
    ];

    const s1 = buildSessionSinglesResumen(history, "s1", "game");
    const s2 = buildSessionSinglesResumen(history, "s2", "game");
    const aEndS1 = s1.find((r) => r.playerId === "a")!.eloEnd;
    const aStartS2 = s2.find((r) => r.playerId === "a")!.eloStart;
    expect(aStartS2).toBe(aEndS1);
  });

  it("sorts by wins, then eloEnd, then display name", () => {
    const names = new Map([
      ["a", "Zeta"],
      ["b", "Ana"],
      ["c", "Marco"],
    ]);
    // a beats b, a beats c → a 2-0; b and c 0-1 with same Elo end
    const rows = buildSessionSinglesResumen(
      [
        match({
          id: "1",
          sessionId: "s1",
          sideA: ["a"],
          sideB: ["b"],
          winnerSide: "A",
          createdAt: "2026-01-01T14:00:00.000Z",
        }),
        match({
          id: "2",
          sessionId: "s1",
          sideA: ["a"],
          sideB: ["c"],
          winnerSide: "A",
          createdAt: "2026-01-01T14:01:00.000Z",
        }),
      ],
      "s1",
      "game",
      undefined,
      names,
    );
    expect(rows.map((r) => r.playerId)).toEqual(["a", "b", "c"]);
    // b and c both 0-1; Ana before Marco
    expect(rows[1]!.playerId).toBe("b");
    expect(rows[2]!.playerId).toBe("c");
  });
});

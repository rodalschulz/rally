import { describe, expect, it } from "vitest";
import type { Match } from "@/lib/domain/types";
import {
  ELO_INITIAL,
  ELO_K_BY_UNIT,
  buildEloRanking,
} from "./elo";

function match(
  partial: Partial<Match> & Pick<Match, "id" | "winnerSide">,
): Match {
  return {
    sessionId: "s1",
    format: "singles",
    unit: "set",
    sideA: ["a"],
    sideB: ["b"],
    score: "6-4",
    sessionStartsAt: "2026-01-01T12:00:00.000Z",
    createdAt: "2026-01-01T14:00:00.000Z",
    ...partial,
  };
}

describe("buildEloRanking", () => {
  it("seeds all members at the initial rating with no matches", () => {
    expect(buildEloRanking([], "set")).toEqual([]);
    expect(buildEloRanking([], "set", ["b", "a"])).toEqual([
      { playerId: "a", played: 0, wins: 0, losses: 0, points: ELO_INITIAL },
      { playerId: "b", played: 0, wins: 0, losses: 0, points: ELO_INITIAL },
    ]);
  });

  it("sorts by Elo then display name when ratings tie", () => {
    const names = new Map([
      ["id-z", "Zeta"],
      ["id-a", "Ana"],
      ["id-m", "Marco"],
    ]);
    const rows = buildEloRanking([], "set", ["id-z", "id-m", "id-a"], names);
    expect(rows.map((r) => r.playerId)).toEqual(["id-a", "id-m", "id-z"]);
  });

  it("sorts higher Elo above lower Elo regardless of name", () => {
    const names = new Map([
      ["a", "Ana"],
      ["b", "Bruno"],
    ]);
    const matches: Match[] = [
      match({ id: "1", sideA: ["b"], sideB: ["a"], winnerSide: "A" }),
    ];
    const rows = buildEloRanking(matches, "set", ["a", "b"], names);
    expect(rows.map((r) => r.playerId)).toEqual(["b", "a"]);
    expect(rows[0]!.points).toBeGreaterThan(rows[1]!.points);
  });

  it("hides unplayed members once anyone has a result", () => {
    const matches: Match[] = [
      match({ id: "1", unit: "set", winnerSide: "A" }),
    ];
    const rows = buildEloRanking(matches, "set", ["a", "b", "c"]);
    expect(rows.map((r) => r.playerId).sort()).toEqual(["a", "b"]);
    expect(rows.every((r) => r.played > 0)).toBe(true);
  });

  it("updates ratings after a set win and ignores games / doubles", () => {
    const matches: Match[] = [
      match({ id: "1", unit: "set", winnerSide: "A" }),
      match({
        id: "g1",
        unit: "game",
        score: "1-0",
        winnerSide: "A",
        createdAt: "2026-01-01T15:00:00.000Z",
      }),
      match({
        id: "d1",
        format: "doubles",
        unit: "set",
        sideA: ["a", "c"],
        sideB: ["b", "d"],
        winnerSide: "A",
        createdAt: "2026-01-01T16:00:00.000Z",
      }),
    ];

    const rows = buildEloRanking(matches, "set");
    const k = ELO_K_BY_UNIT.set;
    const expectedWinner = Math.round(ELO_INITIAL + k * 0.5);
    const expectedLoser = Math.round(ELO_INITIAL - k * 0.5);

    expect(rows).toEqual([
      {
        playerId: "a",
        played: 1,
        wins: 1,
        losses: 0,
        points: expectedWinner,
      },
      {
        playerId: "b",
        played: 1,
        wins: 0,
        losses: 1,
        points: expectedLoser,
      },
    ]);
  });

  it("uses a smaller K for loose games", () => {
    const matches: Match[] = [
      match({
        id: "g1",
        unit: "game",
        score: "1-0",
        winnerSide: "A",
      }),
    ];
    const rows = buildEloRanking(matches, "game");
    const k = ELO_K_BY_UNIT.game;
    expect(rows[0]?.points).toBe(Math.round(ELO_INITIAL + k * 0.5));
    expect(rows[1]?.points).toBe(Math.round(ELO_INITIAL - k * 0.5));
  });

  it("does not expand a set score into the games ladder", () => {
    const matches: Match[] = [
      match({ id: "set", unit: "set", score: "6-4", winnerSide: "A" }),
    ];
    expect(buildEloRanking(matches, "game")).toEqual([]);
    expect(buildEloRanking(matches, "set")).toHaveLength(2);
  });

  it("applies matches in chronological order (session then createdAt)", () => {
    // Later session first in array — must still process earlier session first.
    const matches: Match[] = [
      match({
        id: "later",
        sessionStartsAt: "2026-02-01T12:00:00.000Z",
        createdAt: "2026-02-01T14:00:00.000Z",
        sideA: ["a"],
        sideB: ["c"],
        winnerSide: "A",
      }),
      match({
        id: "earlier",
        sessionStartsAt: "2026-01-01T12:00:00.000Z",
        createdAt: "2026-01-01T14:00:00.000Z",
        sideA: ["a"],
        sideB: ["b"],
        winnerSide: "A",
      }),
    ];

    const rows = buildEloRanking(matches, "set");
    const byId = Object.fromEntries(rows.map((r) => [r.playerId, r]));

    // a beat b first (equal ratings), then a (higher) beat c — a should lead.
    expect(byId.a.wins).toBe(2);
    expect(byId.a.points).toBeGreaterThan(byId.c.points);
    expect(byId.a.points).toBeGreaterThan(byId.b.points);

    // If order were reversed, a would gain more vs c first then less vs b;
    // assert the exact rating after correct chronological path.
    const k = ELO_K_BY_UNIT.set;
    let ra = ELO_INITIAL;
    let rb = ELO_INITIAL;
    let rc = ELO_INITIAL;
    // earlier: a vs b
    {
      const ea = 1 / (1 + 10 ** ((rb - ra) / 400));
      const eb = 1 / (1 + 10 ** ((ra - rb) / 400));
      ra = ra + k * (1 - ea);
      rb = rb + k * (0 - eb);
    }
    // later: a vs c
    {
      const ea = 1 / (1 + 10 ** ((rc - ra) / 400));
      const ec = 1 / (1 + 10 ** ((ra - rc) / 400));
      ra = ra + k * (1 - ea);
      rc = rc + k * (0 - ec);
    }
    expect(byId.a.points).toBe(Math.round(ra));
    expect(byId.b.points).toBe(Math.round(rb));
    expect(byId.c.points).toBe(Math.round(rc));
  });

  it("ignores in-progress matches (null winnerSide)", () => {
    const matches: Match[] = [
      match({ id: "open", winnerSide: null, score: "" }),
      match({ id: "done", winnerSide: "A" }),
    ];
    const rows = buildEloRanking(matches, "set");
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.playerId).sort()).toEqual(["a", "b"]);
    expect(rows.every((r) => r.played === 1)).toBe(true);
  });

  it("ignores soft-deleted matches", () => {
    const matches: Match[] = [
      match({
        id: "gone",
        winnerSide: "A",
        deletedAt: "2026-01-01T15:00:00.000Z",
      }),
      match({ id: "live", winnerSide: "B", createdAt: "2026-01-01T16:00:00.000Z" }),
    ];
    const rows = buildEloRanking(matches, "set");
    expect(rows.map((r) => r.playerId)).toEqual(["b", "a"]);
    expect(rows.every((r) => r.played === 1)).toBe(true);
  });

  it("rebuilds as if an edited or deleted match always had the final state", () => {
    const k = ELO_K_BY_UNIT.game;
    const afterAWins = buildEloRanking(
      [
        match({
          id: "g1",
          unit: "game",
          score: "1-0",
          winnerSide: "A",
        }),
      ],
      "game",
    );
    expect(afterAWins[0]?.playerId).toBe("a");
    expect(afterAWins[0]?.points).toBe(Math.round(ELO_INITIAL + k * 0.5));

    // Edit: flip winner to B — same as if B had always won.
    const afterEdit = buildEloRanking(
      [
        match({
          id: "g1",
          unit: "game",
          score: "1-0",
          winnerSide: "B",
        }),
      ],
      "game",
    );
    expect(afterEdit[0]?.playerId).toBe("b");
    expect(afterEdit[0]?.points).toBe(Math.round(ELO_INITIAL + k * 0.5));
    expect(afterEdit[1]?.playerId).toBe("a");
    expect(afterEdit[1]?.points).toBe(Math.round(ELO_INITIAL - k * 0.5));

    // Delete: empty ladder again.
    expect(buildEloRanking([], "game", ["a", "b"])).toEqual([
      { playerId: "a", played: 0, wins: 0, losses: 0, points: ELO_INITIAL },
      { playerId: "b", played: 0, wins: 0, losses: 0, points: ELO_INITIAL },
    ]);
  });

  it("sorts by Elo when ratings diverge after play", () => {
    const matches: Match[] = [
      match({
        id: "1",
        sideA: ["z"],
        sideB: ["m"],
        winnerSide: "A",
        createdAt: "2026-01-01T14:00:00.000Z",
      }),
      match({
        id: "2",
        sideA: ["a"],
        sideB: ["m"],
        winnerSide: "A",
        createdAt: "2026-01-01T15:00:00.000Z",
      }),
    ];
    // z beats m, then a beats m (m is weaker) — a faces lower-rated m so
    // gains less than z; z ranks above a by Elo.
    const names = new Map([
      ["a", "Ana"],
      ["m", "Marco"],
      ["z", "Zeta"],
    ]);
    const rows = buildEloRanking(matches, "set", [], names);
    expect(rows.map((r) => r.playerId)).toEqual(["z", "a", "m"]);
  });
});

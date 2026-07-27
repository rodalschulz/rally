import { describe, expect, it } from "vitest";
import type { Match } from "@/lib/domain/types";
import { buildRanking } from "./simple";

function match(partial: Partial<Match> & Pick<Match, "id" | "winnerSide">): Match {
  return {
    sessionId: "s1",
    format: "singles",
    unit: "set",
    sideA: ["a"],
    sideB: ["b"],
    score: "6-4",
    ...partial,
  };
}

describe("buildRanking", () => {
  it("awards 3 points per set win and ignores other units/formats", () => {
    const matches: Match[] = [
      match({ id: "1", unit: "set", winnerSide: "A" }),
      match({ id: "2", unit: "set", winnerSide: "B" }),
      match({
        id: "3",
        unit: "game",
        score: "1-0",
        winnerSide: "A",
      }),
      match({
        id: "4",
        format: "doubles",
        unit: "set",
        sideA: ["a", "c"],
        sideB: ["b", "d"],
        winnerSide: "A",
      }),
    ];

    const rows = buildRanking(matches, "singles", "set");
    expect(rows).toEqual([
      { playerId: "a", played: 2, wins: 1, losses: 1, points: 3 },
      { playerId: "b", played: 2, wins: 1, losses: 1, points: 3 },
    ]);
  });

  it("awards 1 point per loose game win", () => {
    const matches: Match[] = [
      match({
        id: "g1",
        unit: "game",
        score: "1-0",
        winnerSide: "A",
      }),
      match({
        id: "g2",
        unit: "game",
        score: "1-0",
        winnerSide: "A",
      }),
      match({
        id: "s1",
        unit: "set",
        score: "6-3",
        winnerSide: "B",
      }),
    ];

    const rows = buildRanking(matches, "singles", "game");
    expect(rows).toEqual([
      { playerId: "a", played: 2, wins: 2, losses: 0, points: 2 },
      { playerId: "b", played: 2, wins: 0, losses: 2, points: 0 },
    ]);
  });

  it("does not expand a set score into ranked games", () => {
    const matches: Match[] = [
      match({ id: "set", unit: "set", score: "6-4", winnerSide: "A" }),
    ];
    expect(buildRanking(matches, "singles", "game")).toEqual([]);
    expect(buildRanking(matches, "singles", "set")[0]?.points).toBe(3);
  });

  it("sorts by points, then wins, then playerId", () => {
    const matches: Match[] = [
      match({
        id: "1",
        sideA: ["z"],
        sideB: ["m"],
        winnerSide: "A",
      }),
      match({
        id: "2",
        sideA: ["a"],
        sideB: ["m"],
        winnerSide: "A",
      }),
    ];
    const rows = buildRanking(matches, "singles", "set");
    expect(rows.map((r) => r.playerId)).toEqual(["a", "z", "m"]);
  });
});

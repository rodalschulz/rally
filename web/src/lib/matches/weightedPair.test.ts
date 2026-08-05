import { describe, expect, it } from "vitest";
import {
  countGamesByPlayer,
  gamePairWeight,
  pickFairGamePair,
} from "./weightedPair";

function seq(...values: number[]): () => number {
  let i = 0;
  return () => {
    const v = values[i] ?? 0;
    i += 1;
    return v;
  };
}

describe("countGamesByPlayer", () => {
  it("counts each appearance in sideA/sideB", () => {
    const counts = countGamesByPlayer(
      ["a", "b", "c"],
      [
        { sideA: ["a"], sideB: ["b"] },
        { sideA: ["a"], sideB: ["c"] },
      ],
    );
    expect(counts.get("a")).toBe(2);
    expect(counts.get("b")).toBe(1);
    expect(counts.get("c")).toBe(1);
  });

  it("ignores ids outside the candidate list", () => {
    const counts = countGamesByPlayer(
      ["a", "b"],
      [{ sideA: ["a"], sideB: ["ghost"] }],
    );
    expect(counts.get("a")).toBe(1);
    expect(counts.get("b")).toBe(0);
  });
});

describe("gamePairWeight", () => {
  it("gives higher weight to fewer games", () => {
    expect(gamePairWeight(0, 3)).toBe(4);
    expect(gamePairWeight(3, 3)).toBe(1);
  });
});

describe("pickFairGamePair", () => {
  it("returns null with fewer than two players", () => {
    expect(pickFairGamePair(["a"], [], () => 0)).toBeNull();
  });

  it("prefers players with fewer games when random lands early", () => {
    // Candidates a:2, b:2, c:0 → weights 1,1,3 (max=2). Total 5.
    // First draw 0.5 → past a(1)+b(1)=2, into c → first=c
    // Rest a,b weights 1,1 total 2. Second draw 0 → a
    // Side flip: third random 0.6 → no flip → player1=c, player2=a
    const pair = pickFairGamePair(
      ["a", "b", "c"],
      [
        { sideA: ["a"], sideB: ["b"] },
        { sideA: ["a"], sideB: ["b"] },
      ],
      seq(0.5, 0, 0.6),
    );
    expect(pair).toEqual({ player1Id: "c", player2Id: "a" });
  });

  it("flips sides when the last random is low", () => {
    const pair = pickFairGamePair(
      ["a", "b"],
      [],
      seq(0, 0, 0.1),
    );
    expect(pair).toEqual({ player1Id: "b", player2Id: "a" });
  });
});

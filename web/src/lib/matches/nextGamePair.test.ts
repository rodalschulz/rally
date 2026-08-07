import { describe, expect, it } from "vitest";
import {
  countGamesByPlayer,
  countH2H,
  lastServerPlayerId,
  pickNextGamePair,
  sitStreak,
  type GamePairInput,
} from "./nextGamePair";

function game(
  a: string,
  b: string,
  opts: { serverSide?: "A" | "B" | null; deletedAt?: string | null } = {},
): GamePairInput {
  return {
    sideA: [a],
    sideB: [b],
    serverSide: opts.serverSide ?? null,
    deletedAt: opts.deletedAt ?? null,
  };
}

describe("countGamesByPlayer", () => {
  it("counts each appearance and skips deleted", () => {
    const counts = countGamesByPlayer(
      ["a", "b", "c"],
      [
        game("a", "b"),
        game("a", "c", { deletedAt: "2026-01-01" }),
        game("a", "c"),
      ],
    );
    expect(counts.get("a")).toBe(2);
    expect(counts.get("b")).toBe(1);
    expect(counts.get("c")).toBe(1);
  });
});

describe("countH2H", () => {
  it("counts unordered meetings", () => {
    const h2h = countH2H(
      ["a", "b", "c"],
      [game("a", "b"), game("b", "a"), game("a", "c")],
    );
    expect(h2h.get("a\0b")).toBe(2);
    expect(h2h.get("a\0c")).toBe(1);
  });
});

describe("sitStreak", () => {
  it("counts consecutive sits from the end", () => {
    const games = [game("a", "b"), game("c", "d"), game("a", "c")];
    expect(sitStreak("b", games)).toBe(2);
    expect(sitStreak("d", games)).toBe(1);
    expect(sitStreak("a", games)).toBe(0);
  });
});

describe("lastServerPlayerId", () => {
  it("returns the last recorded server between the pair", () => {
    const games = [
      game("a", "b", { serverSide: "A" }),
      game("c", "d", { serverSide: "B" }),
      game("a", "b", { serverSide: null }),
      game("b", "a", { serverSide: "A" }), // b served
    ];
    expect(lastServerPlayerId("a", "b", games)).toBe("b");
  });

  it("skips deleted and looks past null serverSide", () => {
    const games = [
      game("a", "b", { serverSide: "B" }),
      game("a", "b", { serverSide: "A", deletedAt: "x" }),
      game("a", "b", { serverSide: null }),
    ];
    expect(lastServerPlayerId("a", "b", games)).toBe("b");
  });
});

describe("pickNextGamePair", () => {
  it("returns null with fewer than two players", () => {
    expect(pickNextGamePair(["a"], [], () => 0)).toBeNull();
  });

  it("picks lexicographically first pair when history is empty", () => {
    const pair = pickNextGamePair(["c", "a", "b"], [], () => 0.9);
    expect(pair).toEqual({
      player1Id: "a",
      player2Id: "b",
      serverSide: "B", // random >= 0.5 → player2
    });
  });

  it("prefers unfinished round-robin over rematches", () => {
    // After a-b, next among remaining should not be a-b again
    const pair = pickNextGamePair(
      ["a", "b", "c"],
      [game("a", "b")],
      () => 0,
    );
    expect(pair?.player1Id).toBe("a");
    expect(pair?.player2Id).toBe("c");
  });

  it("rotates sitters for five players across the first few games", () => {
    const players = ["a", "b", "c", "d", "e"];
    const history: GamePairInput[] = [];
    const pairs: string[] = [];
    for (let i = 0; i < 5; i++) {
      const next = pickNextGamePair(players, history, () => 0);
      expect(next).not.toBeNull();
      pairs.push(`${next!.player1Id}-${next!.player2Id}`);
      history.push(game(next!.player1Id, next!.player2Id, { serverSide: "A" }));
    }
    // First: a-b (lex). Then c-d (0 games, sat). Then a-e. Then b-c. Then d-e.
    expect(pairs).toEqual(["a-b", "c-d", "a-e", "b-c", "d-e"]);
    // Nobody should dominate early: after 5 games with 5 players, counts are 2 each
    const counts = countGamesByPlayer(players, history);
    expect([...counts.values()].every((n) => n === 2)).toBe(true);
  });

  it("alternates servidor on rematch", () => {
    const history = [game("a", "b", { serverSide: "A" })];
    // Force rematch: only two players
    const pair = pickNextGamePair(["a", "b"], history, () => 0);
    expect(pair).toEqual({
      player1Id: "a",
      player2Id: "b",
      serverSide: "B", // a served last → b serves
    });
  });

  it("uses random only when the pair has no prior server", () => {
    const low = pickNextGamePair(["a", "b"], [], () => 0.1);
    const high = pickNextGamePair(["a", "b"], [], () => 0.9);
    expect(low?.serverSide).toBe("A");
    expect(high?.serverSide).toBe("B");
  });

  it("ignores deleted games for pairing and server", () => {
    const pair = pickNextGamePair(
      ["a", "b", "c"],
      [
        game("a", "b", { serverSide: "A", deletedAt: "x" }),
        game("a", "c", { serverSide: "B" }),
      ],
      () => 0,
    );
    // Active: only a-c. Next unfinished RR among a,b,c with fewest games: b with someone.
    // games: a1 c1 b0 → prefer pairs with b: a-b (sum1) or b-c (sum1). sit: last was a-c so b sit1, a0 c0.
    // a-b sitSum=1, b-c sitSum=1 → lex a-b
    expect(pair).toEqual({
      player1Id: "a",
      player2Id: "b",
      serverSide: "A", // no active prior a-b server → random 0 → A
    });
  });
});

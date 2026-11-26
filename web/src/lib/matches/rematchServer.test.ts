import { describe, expect, it } from "vitest";
import {
  lastServerPlayerId,
  rematchServerSide,
  type GamePairInput,
} from "./rematchServer";

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

describe("lastServerPlayerId", () => {
  it("returns the last recorded server between the pair", () => {
    const games = [
      game("a", "b", { serverSide: "A" }),
      game("c", "d", { serverSide: "B" }),
      game("a", "b", { serverSide: null }),
      game("b", "a", { serverSide: "A" }),
    ];
    expect(lastServerPlayerId("a", "b", games)).toBe("b");
  });

  it("skips deleted games and games without a server", () => {
    const games = [
      game("a", "b", { serverSide: "B" }),
      game("a", "b", { serverSide: "A", deletedAt: "x" }),
      game("a", "b", { serverSide: null }),
    ];
    expect(lastServerPlayerId("a", "b", games)).toBe("b");
  });
});

describe("rematchServerSide", () => {
  it("selects nothing when the pair has no prior game", () => {
    expect(rematchServerSide("a", "b", [])).toBeNull();
    expect(rematchServerSide("a", "b", [game("a", "c", { serverSide: "A" })])).toBe(
      null,
    );
  });

  it("selects nothing when prior games have no server", () => {
    expect(rematchServerSide("a", "b", [game("a", "b")])).toBeNull();
  });

  it("gives the serve to whoever did not serve last, in the current select order", () => {
    const games = [game("a", "b", { serverSide: "A" })];
    expect(rematchServerSide("a", "b", games)).toBe("B");
    expect(rematchServerSide("b", "a", games)).toBe("A");
  });

  it("ignores a deleted game and a game without a server", () => {
    const games = [
      game("a", "b", { serverSide: "B" }),
      game("a", "b", { serverSide: "A", deletedAt: "x" }),
      game("b", "a"),
    ];
    expect(rematchServerSide("a", "b", games)).toBe("A");
  });
});

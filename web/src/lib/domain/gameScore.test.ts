import { describe, expect, it } from "vitest";
import { formatSetScore, parseSetScore, tryParseSetGames } from "./gameScore";

describe("tryParseSetGames", () => {
  it("parses A-B without tennis-rule checks", () => {
    expect(tryParseSetGames("6-0")).toEqual({ gamesA: 6, gamesB: 0 });
    expect(tryParseSetGames(" 7–6 ")).toEqual({ gamesA: 7, gamesB: 6 });
    expect(tryParseSetGames("5-3")).toEqual({ gamesA: 5, gamesB: 3 });
  });

  it("returns null for empty or malformed scores", () => {
    expect(tryParseSetGames("")).toBeNull();
    expect(tryParseSetGames("foo")).toBeNull();
    expect(tryParseSetGames("6")).toBeNull();
  });
});

describe("parseSetScore", () => {
  it("parses winner from 6-4", () => {
    expect(parseSetScore("6-4")).toEqual({
      gamesA: 6,
      gamesB: 4,
      winnerSide: "A",
    });
    expect(parseSetScore("4-6")).toEqual({
      gamesA: 4,
      gamesB: 6,
      winnerSide: "B",
    });
  });

  it("accepts soft separators and whitespace", () => {
    expect(parseSetScore(" 7–5 ")).toMatchObject({
      gamesA: 7,
      gamesB: 5,
      winnerSide: "A",
    });
  });

  it("rejects ties", () => {
    expect(() => parseSetScore("6-6")).toThrow(/empatar/);
  });

  it("rejects scores where neither side reached 6", () => {
    expect(() => parseSetScore("5-3")).toThrow(/llegar a 6/);
  });

  it("rejects invalid shapes", () => {
    expect(() => parseSetScore("foo")).toThrow(/Marcador inválido/);
    expect(() => parseSetScore("6")).toThrow(/Marcador inválido/);
  });
});

describe("formatSetScore", () => {
  it("formats games as A-B", () => {
    expect(formatSetScore(6, 4)).toBe("6-4");
  });
});

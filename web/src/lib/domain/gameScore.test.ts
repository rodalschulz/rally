import { describe, expect, it } from "vitest";
import { formatSetScore, parseSetScore } from "./gameScore";

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

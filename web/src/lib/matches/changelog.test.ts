import { describe, expect, it } from "vitest";
import {
  describeMatchSnapshot,
  formatMatchChangeSummary,
  type MatchSnapshot,
} from "./changelog";

const names = (id: string) =>
  ({ a: "Ana", b: "Bruno", c: "Carla" })[id] ?? "?";

function snap(partial: Partial<MatchSnapshot> = {}): MatchSnapshot {
  return {
    unit: "game",
    sideA: ["a"],
    sideB: ["b"],
    score: "1-0",
    winnerSide: "A",
    serverSide: null,
    ...partial,
  };
}

describe("describeMatchSnapshot", () => {
  it("describes a completed game", () => {
    expect(describeMatchSnapshot(snap(), names)).toBe("Game: Ana ganó a Bruno");
  });

  it("appends servidor when set on a game", () => {
    expect(describeMatchSnapshot(snap({ serverSide: "B" }), names)).toBe(
      "Game: Ana ganó a Bruno · Servidor Bruno",
    );
  });

  it("describes in-progress and sets", () => {
    expect(
      describeMatchSnapshot(snap({ winnerSide: null, score: "" }), names),
    ).toBe("Game En curso: Ana vs Bruno");
    expect(
      describeMatchSnapshot(
        snap({ unit: "set", score: "6-4", winnerSide: "B", serverSide: "A" }),
        names,
      ),
    ).toBe("Set 6-4: Ana vs Bruno");
  });
});

describe("formatMatchChangeSummary", () => {
  it("prefixes action verbs", () => {
    expect(formatMatchChangeSummary("created", snap(), names)).toBe(
      "Agregó Game: Ana ganó a Bruno",
    );
    expect(formatMatchChangeSummary("deleted", snap(), names)).toBe(
      "Borró Game: Ana ganó a Bruno",
    );
    expect(formatMatchChangeSummary("restored", snap(), names)).toBe(
      "Restauró Game: Ana ganó a Bruno",
    );
  });

  it("shows before → after on edits", () => {
    const before = snap({ winnerSide: "A" });
    const after = snap({ winnerSide: "B" });
    expect(formatMatchChangeSummary("updated", after, names, before)).toBe(
      "Editó Game: Ana ganó a Bruno → Game: Bruno ganó a Ana",
    );
  });
});

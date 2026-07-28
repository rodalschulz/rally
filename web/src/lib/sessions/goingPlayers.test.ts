import { describe, expect, it } from "vitest";
import type { Attendance, Player } from "@/lib/domain/types";
import { goingFrom } from "./goingPlayers";

function player(id: string, displayName: string): Player {
  return { id, displayName, shortName: displayName, hue: 0 };
}

const players = [
  player("zoe", "Zoe"),
  player("ana", "Ana"),
  player("carlos", "Carlos"),
  player("bruno", "Bruno"),
];

function going(...playerIds: string[]): Attendance[] {
  return playerIds.map((playerId) => ({
    sessionId: "s1",
    playerId,
    status: "going" as const,
  }));
}

describe("goingFrom", () => {
  it("puts the session creator first when they are going, then A–Z", () => {
    const { players: list, count } = goingFrom(
      "s1",
      going("zoe", "ana", "carlos", "bruno"),
      players,
      "carlos",
    );
    expect(count).toBe(4);
    expect(list.map((p) => p.id)).toEqual(["carlos", "ana", "bruno", "zoe"]);
  });

  it("sorts A–Z when the creator is not going", () => {
    const { players: list } = goingFrom(
      "s1",
      going("zoe", "ana", "bruno"),
      players,
      "carlos",
    );
    expect(list.map((p) => p.id)).toEqual(["ana", "bruno", "zoe"]);
  });

  it("ignores non-going attendances and other sessions", () => {
    const attendances: Attendance[] = [
      ...going("ana", "bruno"),
      { sessionId: "s1", playerId: "zoe", status: "maybe" },
      { sessionId: "s2", playerId: "carlos", status: "going" },
    ];
    const { players: list, count } = goingFrom(
      "s1",
      attendances,
      players,
      "ana",
    );
    expect(count).toBe(2);
    expect(list.map((p) => p.id)).toEqual(["ana", "bruno"]);
  });
});

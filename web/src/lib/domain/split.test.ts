import { describe, expect, it } from "vitest";
import type { Attendance, Session } from "./types";
import { computeSessionDebts, netBalances, roundMoney } from "./split";

function session(partial: Partial<Session> = {}): Session {
  return {
    id: "s1",
    startsAt: "2026-07-26T20:00:00.000Z",
    costAmount: 40,
    currency: "PEN",
    financierId: "carlos",
    createdById: "carlos",
    financierCoversAll: false,
    status: "scheduled",
    allowedUserIds: [],
    ...partial,
  };
}

function going(...playerIds: string[]): Attendance[] {
  return playerIds.map((playerId) => ({
    sessionId: "s1",
    playerId,
    status: "going" as const,
  }));
}

describe("computeSessionDebts", () => {
  it("splits evenly when financier is going", () => {
    const debts = computeSessionDebts(
      session({ costAmount: 40 }),
      going("ana", "bruno", "carlos", "diana"),
    );
    expect(debts).toHaveLength(3);
    expect(debts.every((d) => d.amount === 10)).toBe(true);
    expect(debts.every((d) => d.toPlayerId === "carlos")).toBe(true);
    expect(debts.map((d) => d.fromPlayerId).sort()).toEqual([
      "ana",
      "bruno",
      "diana",
    ]);
  });

  it("charges every going player when financier is not going", () => {
    const debts = computeSessionDebts(
      session({ costAmount: 22, financierId: "ana" }),
      going("bruno", "carla"),
    );
    expect(debts).toEqual([
      {
        fromPlayerId: "bruno",
        toPlayerId: "ana",
        sessionId: "s1",
        amount: 11,
      },
      {
        fromPlayerId: "carla",
        toPlayerId: "ana",
        sessionId: "s1",
        amount: 11,
      },
    ]);
  });

  it("returns no debts when financier covers all", () => {
    expect(
      computeSessionDebts(
        session({ financierCoversAll: true }),
        going("ana", "bruno", "carlos"),
      ),
    ).toEqual([]);
  });

  it("returns no debts with zero going or non-positive cost", () => {
    expect(computeSessionDebts(session(), [])).toEqual([]);
    expect(
      computeSessionDebts(session({ costAmount: 0 }), going("ana", "carlos")),
    ).toEqual([]);
  });
});

describe("roundMoney", () => {
  it("rounds to cents", () => {
    expect(roundMoney(22 / 3)).toBe(7.33);
  });
});

describe("netBalances", () => {
  it("nets open debts only", () => {
    const map = netBalances(
      [
        {
          id: "1",
          fromPlayerId: "bruno",
          toPlayerId: "ana",
          sessionId: "s1",
          amount: 11,
          status: "open",
        },
        {
          id: "2",
          fromPlayerId: "carla",
          toPlayerId: "ana",
          sessionId: "s1",
          amount: 11,
          status: "settled",
        },
      ],
      ["ana", "bruno", "carla"],
    );
    expect(map.get("ana")).toBe(11);
    expect(map.get("bruno")).toBe(-11);
    expect(map.get("carla")).toBe(0);
  });
});

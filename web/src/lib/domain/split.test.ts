import { describe, expect, it } from "vitest";
import type { Attendance, Session } from "./types";
import {
  computeSessionDebts,
  netBalances,
  parseCostAmount,
  roundMoney,
  sumMoney,
} from "./split";

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

  it("still splits recoge bolas when financier covers the court", () => {
    const debts = computeSessionDebts(
      session({
        financierCoversAll: true,
        recogeBolasAmount: 8,
        recogeBolasPayerId: "bruno",
      }),
      going("ana", "bruno", "carlos", "diana"),
    );
    expect(debts).toEqual([
      {
        fromPlayerId: "ana",
        toPlayerId: "bruno",
        sessionId: "s1",
        amount: 2,
      },
      {
        fromPlayerId: "carlos",
        toPlayerId: "bruno",
        sessionId: "s1",
        amount: 2,
      },
      {
        fromPlayerId: "diana",
        toPlayerId: "bruno",
        sessionId: "s1",
        amount: 2,
      },
    ]);
  });

  it("merges court and recoge bolas when the same person paid both", () => {
    const debts = computeSessionDebts(
      session({
        costAmount: 40,
        financierId: "carlos",
        recogeBolasAmount: 8,
        recogeBolasPayerId: "carlos",
      }),
      going("ana", "bruno", "carlos", "diana"),
    );
    expect(debts).toHaveLength(3);
    expect(debts.every((d) => d.toPlayerId === "carlos")).toBe(true);
    expect(debts.every((d) => d.amount === 12)).toBe(true);
  });

  it("keeps separate edges when court and recoge bolas have different payers", () => {
    const debts = computeSessionDebts(
      session({
        costAmount: 40,
        financierId: "carlos",
        recogeBolasAmount: 8,
        recogeBolasPayerId: "bruno",
      }),
      going("ana", "bruno", "carlos", "diana"),
    );
    const byPair = debts
      .map((d) => `${d.fromPlayerId}->${d.toPlayerId}:${d.amount}`)
      .sort();
    expect(byPair).toEqual([
      "ana->bruno:2",
      "ana->carlos:10",
      "bruno->carlos:10",
      "carlos->bruno:2",
      "diana->bruno:2",
      "diana->carlos:10",
    ]);
  });

  it("returns no debts with zero going or non-positive cost", () => {
    expect(computeSessionDebts(session(), [])).toEqual([]);
    expect(
      computeSessionDebts(session({ costAmount: 0 }), going("ana", "carlos")),
    ).toEqual([]);
  });

  it("rounds each share to 2 decimals for a 20.25 court", () => {
    const debts = computeSessionDebts(
      session({ costAmount: 20.25 }),
      going("ana", "bruno", "carlos", "diana"),
    );
    expect(debts).toHaveLength(3);
    expect(debts.every((d) => d.amount === 5.06)).toBe(true);
  });
});

describe("roundMoney", () => {
  it("rounds to cents", () => {
    expect(roundMoney(22 / 3)).toBe(7.33);
    expect(roundMoney(20.25 / 4)).toBe(5.06);
    expect(roundMoney(10.125)).toBe(10.13);
  });
});

describe("parseCostAmount", () => {
  it("accepts two-decimal soles and rounds extras", () => {
    expect(parseCostAmount("20.25")).toBe(20.25);
    expect(parseCostAmount("20.259")).toBe(20.26);
    expect(parseCostAmount("0")).toBe(0);
  });

  it("rejects missing or negative amounts", () => {
    expect(parseCostAmount("")).toBeNull();
    expect(parseCostAmount("nope")).toBeNull();
    expect(parseCostAmount("-1")).toBeNull();
  });
});

describe("sumMoney", () => {
  it("adds then rounds so grouped cents stay at 2 decimals", () => {
    expect(sumMoney([5.06, 5.06, 5.06])).toBe(15.18);
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
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

  it("rounds nets to 2 decimals", () => {
    const map = netBalances(
      [
        {
          id: "1",
          fromPlayerId: "bruno",
          toPlayerId: "ana",
          sessionId: "s1",
          amount: 5.06,
          status: "open",
        },
        {
          id: "2",
          fromPlayerId: "carla",
          toPlayerId: "ana",
          sessionId: "s1",
          amount: 5.06,
          status: "open",
        },
        {
          id: "3",
          fromPlayerId: "diana",
          toPlayerId: "ana",
          sessionId: "s1",
          amount: 5.06,
          status: "open",
        },
      ],
      ["ana", "bruno", "carla", "diana"],
    );
    expect(map.get("ana")).toBe(15.18);
    expect(map.get("bruno")).toBe(-5.06);
  });
});

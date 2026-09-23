import { describe, expect, it } from "vitest";
import {
  debtCountsTowardBalance,
  netOpenDebtPairs,
  netPairDebtIds,
  sameDebtIdSet,
  splitNetPairsForViewer,
  type NettableDebt,
} from "./netPairs";

const now = new Date("2026-09-22T22:00:00.000Z");
/** 3h before `now` — past the hub cutoff (start + 2h). */
const past = "2026-09-22T19:00:00.000Z";
/** 1h before `now` — court may have started, results window still open. */
const inWindow = "2026-09-22T21:00:00.000Z";
const future = "2026-12-01T20:00:00.000Z";

function debt(
  partial: Partial<NettableDebt> &
    Pick<NettableDebt, "id" | "fromPlayerId" | "toPlayerId" | "amount">,
): NettableDebt {
  return {
    sessionStartsAt: past,
    ...partial,
  };
}

describe("debtCountsTowardBalance", () => {
  it("counts a fecha only after it is past", () => {
    expect(debtCountsTowardBalance(past, now)).toBe(true);
    expect(debtCountsTowardBalance(inWindow, now)).toBe(false);
    expect(debtCountsTowardBalance(future, now)).toBe(false);
  });
});

describe("netOpenDebtPairs", () => {
  it("offsets opposite debts and keeps the remainder", () => {
    const pairs = netOpenDebtPairs(
      [
        debt({ id: "1", fromPlayerId: "ana", toPlayerId: "bruno", amount: 20 }),
        debt({
          id: "2",
          fromPlayerId: "ana",
          toPlayerId: "bruno",
          amount: 10,
          sessionStartsAt: "2026-09-20T19:00:00.000Z",
        }),
        debt({ id: "3", fromPlayerId: "bruno", toPlayerId: "ana", amount: 18 }),
      ],
      now,
    );
    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toMatchObject({
      debtorId: "ana",
      creditorId: "bruno",
      netAmount: 12,
      owedByDebtor: 30,
      offset: 18,
    });
    expect(pairs[0].debtorDebts.map((d) => d.id)).toEqual(["1", "2"]);
    expect(pairs[0].offsetDebts.map((d) => d.id)).toEqual(["3"]);
  });

  it("flips direction when the other side is larger", () => {
    const pairs = netOpenDebtPairs(
      [
        debt({ id: "1", fromPlayerId: "ana", toPlayerId: "bruno", amount: 10 }),
        debt({ id: "2", fromPlayerId: "bruno", toPlayerId: "ana", amount: 18 }),
      ],
      now,
    );
    expect(pairs[0]).toMatchObject({
      debtorId: "bruno",
      creditorId: "ana",
      netAmount: 8,
      offset: 10,
    });
  });

  it("ignores future and in-progress fechas", () => {
    const pairs = netOpenDebtPairs(
      [
        debt({ id: "past", fromPlayerId: "ana", toPlayerId: "bruno", amount: 11 }),
        debt({
          id: "soon",
          fromPlayerId: "ana",
          toPlayerId: "bruno",
          amount: 40,
          sessionStartsAt: inWindow,
        }),
        debt({
          id: "future",
          fromPlayerId: "bruno",
          toPlayerId: "ana",
          amount: 100,
          sessionStartsAt: future,
        }),
      ],
      now,
    );
    expect(pairs).toHaveLength(1);
    expect(pairs[0].netAmount).toBe(11);
    expect(netPairDebtIds(pairs[0])).toEqual(["past"]);
  });

  it("keeps an exact offset so both sides can be closed", () => {
    const pairs = netOpenDebtPairs(
      [
        debt({ id: "1", fromPlayerId: "ana", toPlayerId: "bruno", amount: 18 }),
        debt({ id: "2", fromPlayerId: "bruno", toPlayerId: "ana", amount: 18 }),
      ],
      now,
    );
    expect(pairs).toHaveLength(1);
    expect(pairs[0].netAmount).toBe(0);
    expect(pairs[0].offset).toBe(18);
    expect(sameDebtIdSet(netPairDebtIds(pairs[0]), ["1", "2"])).toBe(true);
  });

  it("does not mix groups or unrelated pairs", () => {
    const pairs = netOpenDebtPairs(
      [
        debt({
          id: "1",
          fromPlayerId: "ana",
          toPlayerId: "bruno",
          amount: 30,
          groupKey: "g1",
        }),
        debt({
          id: "2",
          fromPlayerId: "bruno",
          toPlayerId: "ana",
          amount: 18,
          groupKey: "g2",
        }),
        debt({
          id: "3",
          fromPlayerId: "ana",
          toPlayerId: "carlos",
          amount: 5,
          groupKey: "g1",
        }),
      ],
      now,
    );
    expect(pairs).toHaveLength(3);
    const anaBrunoG1 = pairs.find(
      (pair) => pair.groupKey === "g1" && pair.creditorId === "bruno",
    );
    expect(anaBrunoG1?.netAmount).toBe(30);
    expect(anaBrunoG1?.offset).toBe(0);
  });

  it("rounds the remainder to cents", () => {
    const pairs = netOpenDebtPairs(
      [
        debt({ id: "1", fromPlayerId: "ana", toPlayerId: "bruno", amount: 10.1 }),
        debt({ id: "2", fromPlayerId: "ana", toPlayerId: "bruno", amount: 10.2 }),
        debt({ id: "3", fromPlayerId: "bruno", toPlayerId: "ana", amount: 0.05 }),
      ],
      now,
    );
    expect(pairs[0].netAmount).toBe(20.25);
  });
});

describe("splitNetPairsForViewer", () => {
  it("puts the remainder on one side only", () => {
    const pairs = netOpenDebtPairs(
      [
        debt({ id: "1", fromPlayerId: "me", toPlayerId: "bruno", amount: 30 }),
        debt({ id: "2", fromPlayerId: "bruno", toPlayerId: "me", amount: 18 }),
        debt({ id: "3", fromPlayerId: "ana", toPlayerId: "carlos", amount: 4 }),
      ],
      now,
    );
    const view = splitNetPairsForViewer(pairs, "me");
    expect(view.iOwe).toHaveLength(1);
    expect(view.iOwe[0].netAmount).toBe(12);
    expect(view.owedToMe).toHaveLength(0);
    expect(view.others.map((pair) => pair.netAmount)).toEqual([4]);
    expect(view.settledOff).toHaveLength(0);
  });

  it("surfaces an exact offset involving me", () => {
    const pairs = netOpenDebtPairs(
      [
        debt({ id: "1", fromPlayerId: "me", toPlayerId: "bruno", amount: 18 }),
        debt({ id: "2", fromPlayerId: "bruno", toPlayerId: "me", amount: 18 }),
      ],
      now,
    );
    const view = splitNetPairsForViewer(pairs, "me");
    expect(view.iOwe).toHaveLength(0);
    expect(view.owedToMe).toHaveLength(0);
    expect(view.settledOff).toHaveLength(1);
  });
});

import { describe, expect, it } from "vitest";
import { debtEdgeKey, reconcileDebtsAgainstComputed } from "./reconcile";

describe("reconcileDebtsAgainstComputed", () => {
  it("keeps matching settled and does not reopen them", () => {
    const settled = [
      { fromPlayerId: "u1", toPlayerId: "fin", amount: 11.25 },
    ];
    const computed = [
      { fromPlayerId: "u1", toPlayerId: "fin", amount: 11.25 },
    ];
    const r = reconcileDebtsAgainstComputed(settled, computed);
    expect(r.orphanSettledKeys.size).toBe(0);
    expect(r.openToCreate).toEqual([]);
  });

  it("marks settled as orphan when the debtor leaves going", () => {
    const settled = [
      { fromPlayerId: "u1", toPlayerId: "fin", amount: 11.25 },
    ];
    const r = reconcileDebtsAgainstComputed(settled, []);
    expect([...r.orphanSettledKeys]).toEqual([
      debtEdgeKey({ fromPlayerId: "u1", toPlayerId: "fin", amount: 11.25 }),
    ]);
    expect(r.openToCreate).toEqual([]);
  });

  it("creates open debts for new going players", () => {
    const r = reconcileDebtsAgainstComputed(
      [],
      [
        { fromPlayerId: "u1", toPlayerId: "fin", amount: 11 },
        { fromPlayerId: "u2", toPlayerId: "fin", amount: 11 },
      ],
    );
    expect(r.openToCreate).toHaveLength(2);
  });

  it("orphans settled when amount no longer matches", () => {
    const settled = [
      { fromPlayerId: "u1", toPlayerId: "fin", amount: 11 },
    ];
    const computed = [
      { fromPlayerId: "u1", toPlayerId: "fin", amount: 20 },
    ];
    const r = reconcileDebtsAgainstComputed(settled, computed);
    expect(r.orphanSettledKeys.size).toBe(1);
    expect(r.openToCreate).toEqual([
      { fromPlayerId: "u1", toPlayerId: "fin", amount: 20 },
    ]);
  });
});

import { describe, expect, it } from "vitest";
import type { DebtWithSession } from "@/lib/domain/types";
import { groupDebtsByCounterparty, othersOpenDebts } from "./groupOpenDebts";

function debt(
  partial: Partial<DebtWithSession> &
    Pick<DebtWithSession, "id" | "fromPlayerId" | "toPlayerId" | "amount">,
): DebtWithSession {
  return {
    sessionId: "s1",
    status: "open",
    sessionStartsAt: "2026-08-12T20:00:00.000Z",
    ...partial,
  };
}

describe("groupDebtsByCounterparty", () => {
  it("groups Debes by creditor", () => {
    const open = [
      debt({
        id: "1",
        fromPlayerId: "me",
        toPlayerId: "ana",
        amount: 11,
        sessionStartsAt: "2026-08-12T20:00:00.000Z",
      }),
      debt({
        id: "2",
        fromPlayerId: "me",
        toPlayerId: "ana",
        amount: 22,
        sessionId: "s2",
        sessionStartsAt: "2026-08-13T20:00:00.000Z",
      }),
      debt({
        id: "3",
        fromPlayerId: "me",
        toPlayerId: "bruno",
        amount: 10,
      }),
    ];
    const groups = groupDebtsByCounterparty(open, "i_owe");
    expect(groups).toHaveLength(2);
    expect(groups[0].counterpartyId).toBe("ana");
    expect(groups[0].total).toBe(33);
    expect(groups[0].debts).toHaveLength(2);
    expect(groups[1].counterpartyId).toBe("bruno");
  });

  it("groups Te deben by debtor", () => {
    const open = [
      debt({ id: "1", fromPlayerId: "ana", toPlayerId: "me", amount: 11 }),
      debt({ id: "2", fromPlayerId: "bruno", toPlayerId: "me", amount: 5 }),
    ];
    const groups = groupDebtsByCounterparty(open, "owed_to_me");
    expect(groups.map((g) => g.counterpartyId)).toEqual(["ana", "bruno"]);
  });
});

describe("othersOpenDebts", () => {
  it("excludes debts involving me", () => {
    const open = [
      debt({ id: "1", fromPlayerId: "me", toPlayerId: "ana", amount: 11 }),
      debt({ id: "2", fromPlayerId: "ana", toPlayerId: "bruno", amount: 5 }),
    ];
    expect(othersOpenDebts(open, "me")).toHaveLength(1);
    expect(othersOpenDebts(open, "me")[0].id).toBe("2");
  });
});

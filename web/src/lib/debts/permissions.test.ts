import { describe, expect, it } from "vitest";
import { canClaimDebtPaid, canSettleDebt, canSettleNetPair } from "./permissions";

const startsAt = new Date("2026-07-26T20:00:00.000Z");
const duringResults = new Date("2026-07-26T21:30:00.000Z");
const afterPast = new Date("2026-07-26T22:00:00.000Z");

describe("canSettleDebt", () => {
  it("allows only the creditor once the fecha is past", () => {
    expect(
      canSettleDebt(
        {
          creditorId: "fin",
          userId: "fin",
          sessionStartsAt: startsAt,
        },
        afterPast,
      ),
    ).toBe(true);
    expect(
      canSettleDebt(
        {
          creditorId: "fin",
          userId: "debtor",
          sessionStartsAt: startsAt,
        },
        afterPast,
      ),
    ).toBe(false);
  });

  it("blocks settling while the fecha is still upcoming", () => {
    expect(
      canSettleDebt(
        {
          creditorId: "fin",
          userId: "fin",
          sessionStartsAt: startsAt,
        },
        duringResults,
      ),
    ).toBe(false);
    expect(
      canSettleDebt(
        {
          creditorId: "fin",
          userId: "admin",
          sessionStartsAt: startsAt,
          isAppAdmin: true,
        },
        duringResults,
      ),
    ).toBe(false);
  });

  it("allows app admin to settle any debt once past", () => {
    expect(
      canSettleDebt(
        {
          creditorId: "fin",
          userId: "admin",
          sessionStartsAt: startsAt,
          isAppAdmin: true,
        },
        afterPast,
      ),
    ).toBe(true);
  });
});

describe("canSettleNetPair", () => {
  const pair = {
    debtorId: "ana",
    creditorId: "bruno",
    netAmount: 12,
    offset: 18,
  };

  it("lets the net creditor close a remainder", () => {
    expect(canSettleNetPair({ ...pair, userId: "bruno" })).toBe(true);
    expect(canSettleNetPair({ ...pair, userId: "ana" })).toBe(false);
  });

  it("lets either side close an exact offset", () => {
    expect(
      canSettleNetPair({ ...pair, netAmount: 0, userId: "ana" }),
    ).toBe(true);
    expect(
      canSettleNetPair({ ...pair, netAmount: 0, userId: "bruno" }),
    ).toBe(true);
    expect(
      canSettleNetPair({ ...pair, netAmount: 0, userId: "carlos" }),
    ).toBe(false);
  });

  it("does not treat a one-direction balance as a net", () => {
    expect(canSettleNetPair({ ...pair, offset: 0, userId: "bruno" })).toBe(
      false,
    );
  });

  it("lets an app admin close any offset pair", () => {
    expect(
      canSettleNetPair({ ...pair, userId: "admin", isAppAdmin: true }),
    ).toBe(true);
  });
});

describe("canClaimDebtPaid", () => {
  it("allows only the debtor on open debts", () => {
    expect(
      canClaimDebtPaid({
        debtorId: "debtor",
        userId: "debtor",
        status: "open",
      }),
    ).toBe(true);
    expect(
      canClaimDebtPaid({
        debtorId: "debtor",
        userId: "creditor",
        status: "open",
      }),
    ).toBe(false);
    expect(
      canClaimDebtPaid({
        debtorId: "debtor",
        userId: "debtor",
        status: "settled",
      }),
    ).toBe(false);
  });
});

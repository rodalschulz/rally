import { describe, expect, it } from "vitest";
import { canSettleDebt } from "./permissions";

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
  });
});

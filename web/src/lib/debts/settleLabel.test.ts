import { describe, expect, it } from "vitest";
import { settleActorLabel } from "./settleLabel";

const names = new Map([
  ["cred", "Ana"],
  ["admin", "Rod"],
]);

describe("settleActorLabel", () => {
  it("returns null when settledById is missing (legacy)", () => {
    expect(
      settleActorLabel({ toPlayerId: "cred" }, names),
    ).toBeNull();
  });

  it("labels creditor settles", () => {
    expect(
      settleActorLabel(
        { toPlayerId: "cred", settledById: "cred" },
        names,
      ),
    ).toBe("Saldó el acreedor (Ana)");
  });

  it("labels admin settles", () => {
    expect(
      settleActorLabel(
        { toPlayerId: "cred", settledById: "admin" },
        names,
      ),
    ).toBe("Saldó un admin (Rod)");
  });

  it("labels a pairwise close without calling it a full payment", () => {
    expect(
      settleActorLabel(
        { toPlayerId: "cred", settledById: "cred", settledAsNet: true },
        names,
      ),
    ).toBe("Compensación de saldos · Ana");
  });
});

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

  it("falls back when display name is unknown", () => {
    expect(
      settleActorLabel(
        { toPlayerId: "cred", settledById: "ghost" },
        names,
      ),
    ).toBe("Saldó un admin (alguien)");
  });
});

import { describe, expect, it } from "vitest";
import { resolveFinancierId } from "./financier";

const members = ["ana", "bruno"];

describe("resolveFinancierId", () => {
  it("keeps the current payer when the actor is not an admin", () => {
    expect(
      resolveFinancierId({
        currentFinancierId: "ana",
        submittedFinancierId: "bruno",
        isAppAdmin: false,
        memberIds: members,
      }),
    ).toEqual({ ok: true, financierId: "ana" });
  });

  it("keeps the current payer when the admin sends nothing or the same id", () => {
    expect(
      resolveFinancierId({
        currentFinancierId: "ana",
        submittedFinancierId: "  ",
        isAppAdmin: true,
        memberIds: members,
      }),
    ).toEqual({ ok: true, financierId: "ana" });
    expect(
      resolveFinancierId({
        currentFinancierId: "ana",
        submittedFinancierId: "ana",
        isAppAdmin: true,
        memberIds: members,
      }),
    ).toEqual({ ok: true, financierId: "ana" });
  });

  it("lets an admin reassign to another member", () => {
    expect(
      resolveFinancierId({
        currentFinancierId: "ana",
        submittedFinancierId: "bruno",
        isAppAdmin: true,
        memberIds: members,
      }),
    ).toEqual({ ok: true, financierId: "bruno" });
  });

  it("rejects a payer who is not a member", () => {
    expect(
      resolveFinancierId({
        currentFinancierId: "ana",
        submittedFinancierId: "outsider",
        isAppAdmin: true,
        memberIds: members,
      }),
    ).toEqual({
      ok: false,
      error: "El financiador tiene que ser miembro del grupo",
    });
  });

  it("keeps a departed payer when the admin does not change them", () => {
    expect(
      resolveFinancierId({
        currentFinancierId: "carlos",
        submittedFinancierId: "carlos",
        isAppAdmin: true,
        memberIds: members,
      }),
    ).toEqual({ ok: true, financierId: "carlos" });
  });
});

import { describe, expect, it } from "vitest";
import {
  canEditRecogeBolas,
  isRecogeBolasApplied,
  resolveRecogeBolas,
} from "./recogeBolas";

describe("isRecogeBolasApplied", () => {
  it("is true only with a payer and a positive amount", () => {
    expect(
      isRecogeBolasApplied({
        recogeBolasAmount: 8,
        recogeBolasPayerId: "bruno",
      }),
    ).toBe(true);
    expect(
      isRecogeBolasApplied({
        recogeBolasAmount: 0,
        recogeBolasPayerId: "bruno",
      }),
    ).toBe(false);
    expect(
      isRecogeBolasApplied({
        recogeBolasAmount: 8,
        recogeBolasPayerId: null,
      }),
    ).toBe(false);
  });
});

describe("canEditRecogeBolas", () => {
  it("lets a going player apply the first time", () => {
    expect(
      canEditRecogeBolas({
        applied: false,
        actorIsGoing: true,
        isAppAdmin: false,
      }),
    ).toBe(true);
  });

  it("locks a going player after apply", () => {
    expect(
      canEditRecogeBolas({
        applied: true,
        actorIsGoing: true,
        isAppAdmin: false,
      }),
    ).toBe(false);
  });

  it("lets an admin edit before and after apply", () => {
    expect(
      canEditRecogeBolas({
        applied: false,
        actorIsGoing: false,
        isAppAdmin: true,
      }),
    ).toBe(true);
    expect(
      canEditRecogeBolas({
        applied: true,
        actorIsGoing: false,
        isAppAdmin: true,
      }),
    ).toBe(true);
  });
});

const going = ["ana", "bruno", "carlos"];

describe("resolveRecogeBolas", () => {
  it("lets a going player apply amount + payer", () => {
    expect(
      resolveRecogeBolas({
        currentAmount: null,
        currentPayerId: null,
        submittedAmount: 8,
        submittedPayerId: "bruno",
        goingIds: going,
        isAppAdmin: false,
        actorIsGoing: true,
      }),
    ).toEqual({ ok: true, amount: 8, payerId: "bruno" });
  });

  it("rejects a non-going actor on first apply", () => {
    expect(
      resolveRecogeBolas({
        currentAmount: null,
        currentPayerId: null,
        submittedAmount: 8,
        submittedPayerId: "bruno",
        goingIds: going,
        isAppAdmin: false,
        actorIsGoing: false,
      }),
    ).toEqual({
      ok: false,
      error: "Solo quien marcó Voy puede registrar recoge bolas",
    });
  });

  it("rejects a going player changing after apply", () => {
    expect(
      resolveRecogeBolas({
        currentAmount: 8,
        currentPayerId: "bruno",
        submittedAmount: 10,
        submittedPayerId: "ana",
        goingIds: going,
        isAppAdmin: false,
        actorIsGoing: true,
      }),
    ).toEqual({
      ok: false,
      error: "Solo un admin puede cambiar recoge bolas",
    });
  });

  it("lets an admin change or clear after apply", () => {
    expect(
      resolveRecogeBolas({
        currentAmount: 8,
        currentPayerId: "bruno",
        submittedAmount: 10,
        submittedPayerId: "ana",
        goingIds: going,
        isAppAdmin: true,
        actorIsGoing: false,
      }),
    ).toEqual({ ok: true, amount: 10, payerId: "ana" });
    expect(
      resolveRecogeBolas({
        currentAmount: 8,
        currentPayerId: "bruno",
        submittedAmount: 0,
        submittedPayerId: "bruno",
        goingIds: going,
        isAppAdmin: true,
        actorIsGoing: true,
      }),
    ).toEqual({ ok: true, amount: null, payerId: null });
  });

  it("rejects a payer who is not going (unless admin keeps a departed one)", () => {
    expect(
      resolveRecogeBolas({
        currentAmount: null,
        currentPayerId: null,
        submittedAmount: 8,
        submittedPayerId: "diana",
        goingIds: going,
        isAppAdmin: true,
        actorIsGoing: true,
      }),
    ).toEqual({
      ok: false,
      error: "Quien pagó tiene que haber marcado Voy",
    });
    expect(
      resolveRecogeBolas({
        currentAmount: 8,
        currentPayerId: "diana",
        submittedAmount: 8,
        submittedPayerId: "diana",
        goingIds: going,
        isAppAdmin: true,
        actorIsGoing: false,
      }),
    ).toEqual({ ok: true, amount: 8, payerId: "diana" });
  });
});

import { describe, expect, it } from "vitest";
import { isMaterialFechaUpdate } from "./fechaDiff";

const base = {
  startsAt: new Date("2026-08-10T22:00:00.000Z"),
  courtLabel: "30",
  costAmount: "40",
  maxAttendees: 4 as number | null,
  allowedUserIds: [] as string[],
  financierCoversAll: false,
  note: null as string | null,
};

describe("isMaterialFechaUpdate", () => {
  it("is false when nothing changed", () => {
    expect(isMaterialFechaUpdate(base, { ...base })).toBe(false);
  });

  it("detects startsAt / cost / allow-list changes", () => {
    expect(
      isMaterialFechaUpdate(base, {
        ...base,
        startsAt: new Date("2026-08-11T22:00:00.000Z"),
      }),
    ).toBe(true);
    expect(
      isMaterialFechaUpdate(base, { ...base, costAmount: "50" }),
    ).toBe(true);
    expect(
      isMaterialFechaUpdate(base, {
        ...base,
        allowedUserIds: ["u1"],
      }),
    ).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  canChangeAttendance,
  canDeletePlaySession,
  canEditPlaySession,
} from "./permissions";

const startsAt = new Date("2026-07-26T20:00:00.000Z");
/** Within results window (endsAt + grace = 22:00Z). */
const duringResults = new Date("2026-07-26T21:30:00.000Z");
/** After hub marks fecha as past. */
const afterPast = new Date("2026-07-26T22:00:00.000Z");
const beforeStart = new Date("2026-07-26T19:00:00.000Z");

const row = {
  createdById: "creator",
  financierId: "financier",
  startsAt,
};

describe("canDeletePlaySession", () => {
  it("allows creator or financier before the fecha is past", () => {
    expect(
      canDeletePlaySession(row, "creator", {
        isGroupOwner: false,
        now: beforeStart,
      }),
    ).toBe(true);
    expect(
      canDeletePlaySession(row, "financier", {
        isGroupOwner: false,
        now: duringResults,
      }),
    ).toBe(true);
    expect(
      canDeletePlaySession(row, "other", {
        isGroupOwner: false,
        now: beforeStart,
      }),
    ).toBe(false);
  });

  it("allows only group owner once the fecha is past", () => {
    expect(
      canDeletePlaySession(row, "creator", {
        isGroupOwner: false,
        now: afterPast,
      }),
    ).toBe(false);
    expect(
      canDeletePlaySession(row, "owner", {
        isGroupOwner: true,
        now: afterPast,
      }),
    ).toBe(true);
  });
});

describe("canEditPlaySession", () => {
  it("allows creator only while not past", () => {
    expect(canEditPlaySession(row, "creator", duringResults)).toBe(true);
    expect(canEditPlaySession(row, "creator", afterPast)).toBe(false);
    expect(canEditPlaySession(row, "financier", beforeStart)).toBe(false);
  });
});

describe("canChangeAttendance", () => {
  it("locks RSVP when the fecha is past", () => {
    expect(canChangeAttendance(startsAt, duringResults)).toBe(true);
    expect(canChangeAttendance(startsAt, afterPast)).toBe(false);
  });
});

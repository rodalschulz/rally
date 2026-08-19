import { describe, expect, it } from "vitest";
import {
  isSessionGamesOpen,
  isSessionPast,
  sessionEndsAt,
  sessionPastCutoff,
} from "./windows";

const startsAt = new Date("2026-07-26T20:00:00.000Z");

describe("session windows", () => {
  it("ends one hour after startsAt", () => {
    expect(sessionEndsAt(startsAt).toISOString()).toBe(
      "2026-07-26T21:00:00.000Z",
    );
  });

  it("keeps results editable until endsAt + 60 minutes", () => {
    // endsAt = 21:00Z; grace → 22:00Z
    expect(
      isSessionGamesOpen(startsAt, new Date("2026-07-26T21:59:59.000Z")),
    ).toBe(true);
    expect(
      isSessionGamesOpen(startsAt, new Date("2026-07-26T22:00:00.000Z")),
    ).toBe(false);
  });

  it("marks fecha as past when the results window closes", () => {
    expect(isSessionPast(startsAt, new Date("2026-07-26T21:59:59.000Z"))).toBe(
      false,
    );
    expect(isSessionPast(startsAt, new Date("2026-07-26T22:00:00.000Z"))).toBe(
      true,
    );
  });

  it("aligns hub cutoff with isSessionPast", () => {
    const now = new Date("2026-07-26T22:00:00.000Z");
    const cutoff = sessionPastCutoff(now);
    expect(cutoff.toISOString()).toBe("2026-07-26T20:00:00.000Z");
    expect(isSessionPast(cutoff, now)).toBe(true);
    expect(
      isSessionPast(new Date(cutoff.getTime() + 1), now),
    ).toBe(false);
  });
});

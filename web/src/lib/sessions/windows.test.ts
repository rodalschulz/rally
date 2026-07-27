import { describe, expect, it } from "vitest";
import {
  isSessionChatOpen,
  isSessionGamesOpen,
  isSessionPast,
  sessionEndsAt,
} from "./windows";

const startsAt = new Date("2026-07-26T20:00:00.000Z");

describe("session windows", () => {
  it("ends one hour after startsAt", () => {
    expect(sessionEndsAt(startsAt).toISOString()).toBe(
      "2026-07-26T21:00:00.000Z",
    );
  });

  it("keeps chat open until startsAt + 30 minutes", () => {
    expect(isSessionChatOpen(startsAt, new Date("2026-07-26T20:29:59.000Z"))).toBe(
      true,
    );
    expect(isSessionChatOpen(startsAt, new Date("2026-07-26T20:30:00.000Z"))).toBe(
      false,
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
});

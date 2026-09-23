import { describe, expect, it } from "vitest";
import {
  calendarDaysBetween,
  isOverdueConfirmedOpenDebt,
  summarizeNetOverdueForUser,
  summarizeOverdueDebts,
} from "./overdueNudge";

describe("calendarDaysBetween", () => {
  it("counts Lima calendar days, not raw 24h multiples", () => {
    // 20:00 Lima 6 Aug = 01:00Z 7 Aug; 10:00 Lima 14 Aug = 15:00Z 14 Aug.
    expect(
      calendarDaysBetween(
        "2026-08-07T01:00:00.000Z",
        "2026-08-14T15:00:00.000Z",
      ),
    ).toBe(8);
  });

  it("is 0 on the same Lima day", () => {
    expect(
      calendarDaysBetween(
        "2026-08-14T05:00:00.000Z",
        "2026-08-14T16:00:00.000Z",
      ),
    ).toBe(0);
  });
});

describe("isOverdueConfirmedOpenDebt", () => {
  const now = "2026-08-14T17:00:00.000Z"; // 12:00 Lima 14 Aug

  it("is false at exactly 7 calendar days", () => {
    expect(isOverdueConfirmedOpenDebt("2026-08-07T17:00:00.000Z", now)).toBe(
      false,
    );
  });

  it("is true when the fecha is more than 7 calendar days ago", () => {
    expect(isOverdueConfirmedOpenDebt("2026-08-06T17:00:00.000Z", now)).toBe(
      true,
    );
  });

  it("is false for a fecha this week", () => {
    expect(isOverdueConfirmedOpenDebt("2026-08-12T17:00:00.000Z", now)).toBe(
      false,
    );
  });
});

describe("summarizeOverdueDebts", () => {
  const now = "2026-08-14T17:00:00.000Z";

  it("returns null when nothing is overdue", () => {
    expect(
      summarizeOverdueDebts(
        [
          {
            amount: 10,
            sessionStartsAt: "2026-08-10T17:00:00.000Z",
            groupSlug: "club",
          },
        ],
        now,
      ),
    ).toBeNull();
  });

  it("sums overdue rows and links to the group with the largest total", () => {
    const nudge = summarizeOverdueDebts(
      [
        {
          amount: 10,
          sessionStartsAt: "2026-08-01T17:00:00.000Z",
          groupSlug: "alpha",
        },
        {
          amount: 20,
          sessionStartsAt: "2026-08-02T17:00:00.000Z",
          groupSlug: "beta",
        },
        {
          amount: 5,
          sessionStartsAt: "2026-08-12T17:00:00.000Z",
          groupSlug: "beta",
        },
      ],
      now,
    );
    expect(nudge).toEqual({
      totalAmount: 30,
      debtCount: 2,
      groupSlug: "beta",
    });
  });
});

describe("summarizeNetOverdueForUser", () => {
  const now = "2026-08-14T17:00:00.000Z";
  const old = "2026-08-01T17:00:00.000Z";
  const recent = "2026-08-12T17:00:00.000Z";

  it("nags the remainder after the other direction is offset", () => {
    const nudge = summarizeNetOverdueForUser(
      [
        {
          id: "1",
          fromPlayerId: "ana",
          toPlayerId: "bruno",
          amount: 30,
          sessionStartsAt: old,
          groupSlug: "club",
        },
        {
          id: "2",
          fromPlayerId: "bruno",
          toPlayerId: "ana",
          amount: 18,
          sessionStartsAt: recent,
          groupSlug: "club",
        },
      ],
      "ana",
      now,
    );
    expect(nudge).toEqual({
      totalAmount: 12,
      debtCount: 1,
      groupSlug: "club",
    });
    expect(
      summarizeNetOverdueForUser(
        [
          {
            id: "1",
            fromPlayerId: "ana",
            toPlayerId: "bruno",
            amount: 30,
            sessionStartsAt: old,
            groupSlug: "club",
          },
          {
            id: "2",
            fromPlayerId: "bruno",
            toPlayerId: "ana",
            amount: 18,
            sessionStartsAt: recent,
            groupSlug: "club",
          },
        ],
        "bruno",
        now,
      ),
    ).toBeNull();
  });

  it("does not nag when both sides cancel", () => {
    expect(
      summarizeNetOverdueForUser(
        [
          {
            id: "1",
            fromPlayerId: "ana",
            toPlayerId: "bruno",
            amount: 18,
            sessionStartsAt: old,
            groupSlug: "club",
          },
          {
            id: "2",
            fromPlayerId: "bruno",
            toPlayerId: "ana",
            amount: 18,
            sessionStartsAt: old,
            groupSlug: "club",
          },
        ],
        "ana",
        now,
      ),
    ).toBeNull();
  });

  it("ignores a future fecha", () => {
    expect(
      summarizeNetOverdueForUser(
        [
          {
            id: "1",
            fromPlayerId: "ana",
            toPlayerId: "bruno",
            amount: 40,
            sessionStartsAt: "2026-08-20T17:00:00.000Z",
            groupSlug: "club",
          },
        ],
        "ana",
        now,
      ),
    ).toBeNull();
  });
});

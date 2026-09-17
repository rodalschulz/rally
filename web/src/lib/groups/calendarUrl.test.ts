import { describe, expect, it } from "vitest";
import {
  canEditGroupCalendarUrl,
  normalizeGroupCalendarUrl,
} from "./calendarUrl";

describe("canEditGroupCalendarUrl", () => {
  it("allows the group owner or an app admin", () => {
    expect(
      canEditGroupCalendarUrl({ isGroupOwner: true, isAppAdmin: false }),
    ).toBe(true);
    expect(
      canEditGroupCalendarUrl({ isGroupOwner: false, isAppAdmin: true }),
    ).toBe(true);
    expect(
      canEditGroupCalendarUrl({ isGroupOwner: false, isAppAdmin: false }),
    ).toBe(false);
  });
});

describe("normalizeGroupCalendarUrl", () => {
  it("treats empty as cleared", () => {
    expect(normalizeGroupCalendarUrl("")).toBeNull();
    expect(normalizeGroupCalendarUrl("   ")).toBeNull();
    expect(normalizeGroupCalendarUrl(null)).toBeNull();
  });

  it("accepts Google Calendar share links", () => {
    const cid =
      "https://calendar.google.com/calendar/u/0?cid=YWJjQGdyb3VwLmNhbGVuZGFyLmdvb2dsZS5jb20";
    expect(normalizeGroupCalendarUrl(`  ${cid}  `)).toBe(cid);

    const short = "https://calendar.app.google/AbCdEf";
    expect(normalizeGroupCalendarUrl(short)).toBe(short);
  });

  it("rejects non-https or non-calendar hosts", () => {
    expect(() =>
      normalizeGroupCalendarUrl("http://calendar.google.com/calendar"),
    ).toThrow(/https/);
    expect(() =>
      normalizeGroupCalendarUrl("https://evil.example/calendar"),
    ).toThrow(/Google Calendar/);
    expect(() => normalizeGroupCalendarUrl("not-a-url")).toThrow(/válido/);
  });
});

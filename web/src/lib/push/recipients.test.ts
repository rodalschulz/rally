import { describe, expect, it } from "vitest";
import {
  excludeActors,
  filterByPreference,
  recipientsForFechaAudience,
  shouldDeleteSubscription,
} from "./recipients";
import { DEFAULT_NOTIFICATION_PREFS, type NotificationPrefs } from "./types";

describe("excludeActors", () => {
  it("removes actor and dedupes", () => {
    expect(excludeActors(["a", "b", "a", "c"], "a")).toEqual(["b", "c"]);
  });

  it("ignores null/undefined exclude ids", () => {
    expect(excludeActors(["a", "b"], null, undefined, "b")).toEqual(["a"]);
  });
});

describe("filterByPreference", () => {
  it("keeps users with pref on or missing prefs (default true)", () => {
    const prefs = new Map<string, NotificationPrefs>([
      ["on", { ...DEFAULT_NOTIFICATION_PREFS, fechaCreated: true }],
      ["off", { ...DEFAULT_NOTIFICATION_PREFS, fechaCreated: false }],
    ]);
    expect(
      filterByPreference(["on", "off", "missing"], prefs, "fechaCreated"),
    ).toEqual(["on", "missing"]);
  });
});

describe("recipientsForFechaAudience", () => {
  it("returns all members when allow list is empty", () => {
    expect(recipientsForFechaAudience(["a", "b", "c"], [])).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("intersects with allow list when set", () => {
    expect(recipientsForFechaAudience(["a", "b", "c"], ["b", "d"])).toEqual([
      "b",
    ]);
  });
});

describe("shouldDeleteSubscription", () => {
  it("deletes on 404 and 410 only", () => {
    expect(shouldDeleteSubscription(404)).toBe(true);
    expect(shouldDeleteSubscription(410)).toBe(true);
    expect(shouldDeleteSubscription(500)).toBe(false);
    expect(shouldDeleteSubscription(undefined)).toBe(false);
  });
});

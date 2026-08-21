import { describe, expect, it } from "vitest";
import { isSafeGroupSlug, parseHomeGroupSlug } from "./home-group";

describe("parseHomeGroupSlug", () => {
  it("accepts a normal group slug", () => {
    expect(parseHomeGroupSlug("miraflores-tenis")).toBe("miraflores-tenis");
  });

  it("rejects empty, path-like, or oversized values", () => {
    expect(parseHomeGroupSlug("")).toBeUndefined();
    expect(parseHomeGroupSlug(null)).toBeUndefined();
    expect(parseHomeGroupSlug("../etc")).toBeUndefined();
    expect(parseHomeGroupSlug("a".repeat(65))).toBeUndefined();
  });
});

describe("isSafeGroupSlug", () => {
  it("allows simple slugs", () => {
    expect(isSafeGroupSlug("abc")).toBe(true);
  });
});

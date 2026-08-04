import { describe, expect, it } from "vitest";
import { normalizeVapidSubject } from "./vapid";

describe("normalizeVapidSubject", () => {
  it("prefixes bare emails with mailto:", () => {
    expect(normalizeVapidSubject("you@example.com")).toBe(
      "mailto:you@example.com",
    );
  });

  it("keeps mailto: and https: subjects", () => {
    expect(normalizeVapidSubject("mailto:you@example.com")).toBe(
      "mailto:you@example.com",
    );
    expect(normalizeVapidSubject("https://example.com")).toBe(
      "https://example.com",
    );
  });
});

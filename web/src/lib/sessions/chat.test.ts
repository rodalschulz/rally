import { describe, expect, it } from "vitest";
import { canPostSessionChat, normalizeChatBody } from "./chat";

describe("canPostSessionChat", () => {
  it("allows going and maybe only", () => {
    expect(canPostSessionChat("going")).toBe(true);
    expect(canPostSessionChat("maybe")).toBe(true);
    expect(canPostSessionChat("not_going")).toBe(false);
    expect(canPostSessionChat("pending")).toBe(false);
    expect(canPostSessionChat(undefined)).toBe(false);
  });
});

describe("normalizeChatBody", () => {
  it("trims and accepts non-empty body", () => {
    expect(normalizeChatBody("  hola  ")).toBe("hola");
  });

  it("rejects empty or oversized bodies", () => {
    expect(() => normalizeChatBody("   ")).toThrow(/vacío/);
    expect(() => normalizeChatBody("x".repeat(501))).toThrow(/muy largo/);
  });
});

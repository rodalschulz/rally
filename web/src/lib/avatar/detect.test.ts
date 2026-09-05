import { describe, expect, it } from "vitest";
import { detectAvatarMime } from "./detect";

const PNG_HEAD = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
]);
const WEBP_HEAD = Uint8Array.from([
  0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
]);
const JPEG_HEAD = Uint8Array.from([
  0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0,
]);

describe("detectAvatarMime", () => {
  it("accepts a PNG whose File.type is empty (Windows picker)", () => {
    expect(detectAvatarMime(PNG_HEAD, "", "sticker.png")).toBe("image/png");
    expect(detectAvatarMime(PNG_HEAD, "application/octet-stream", "")).toBe(
      "image/png",
    );
  });

  it("accepts WebP from RIFF magic even without a MIME hint", () => {
    expect(detectAvatarMime(WEBP_HEAD)).toBe("image/webp");
  });

  it("rejects a JPEG even if the name or hint says PNG", () => {
    expect(detectAvatarMime(JPEG_HEAD, "image/png", "sticker.png")).toBeNull();
  });

  it("falls back to hint/filename only when the head is too short", () => {
    expect(detectAvatarMime(new Uint8Array(4), "image/png")).toBe("image/png");
    expect(detectAvatarMime(new Uint8Array(4), "", "avatar.WEBP")).toBe(
      "image/webp",
    );
    expect(detectAvatarMime(new Uint8Array(4), "image/x-png")).toBe("image/png");
  });
});

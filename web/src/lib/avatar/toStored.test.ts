import { describe, expect, it } from "vitest";
import { AVATAR_MAX_BYTES } from "./constants";
import { isSharpRuntimeError, toStoredAvatar } from "./toStored";

describe("toStoredAvatar", () => {
  it("stores a small PNG without loading sharp", async () => {
    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 1, 2, 3,
    ]);
    const out = await toStoredAvatar(png, "image/png");
    expect(out.contentType).toBe("image/png");
    expect(out.buffer.equals(png)).toBe(true);
    expect(out.buffer.length).toBeLessThanOrEqual(AVATAR_MAX_BYTES);
  });
});

describe("isSharpRuntimeError", () => {
  it("matches the Vercel linux-x64 libvips failure", () => {
    expect(
      isSharpRuntimeError(
        new Error(
          'Could not load the "sharp" module using the linux-x64 runtime\nERR_DLOPEN_FAILED: libvips-cpp.so.8.18.3',
        ),
      ),
    ).toBe(true);
    expect(isSharpRuntimeError(new Error("Usa un PNG o WebP"))).toBe(false);
  });
});

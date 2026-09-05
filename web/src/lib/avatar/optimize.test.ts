import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { AVATAR_MAX_BYTES } from "./constants";
import { optimizeAvatarBuffer } from "./optimize";

describe("optimizeAvatarBuffer", () => {
  it("brings a multi-MB PNG under the 500 KB sticker limit", async () => {
    // Noisy full-color PNG ≈ photo sticker — typically well over 500 KB raw.
    const big = await sharp({
      create: {
        width: 1600,
        height: 1600,
        channels: 4,
        background: { r: 40, g: 120, b: 200, alpha: 1 },
      },
    })
      .png({ compressionLevel: 0 })
      .composite([
        {
          input: await sharp({
            create: {
              width: 1600,
              height: 1600,
              channels: 4,
              noise: { type: "gaussian", mean: 128, sigma: 60 },
            },
          })
            .ensureAlpha()
            .png()
            .toBuffer(),
          blend: "over",
        },
      ])
      .png({ compressionLevel: 0 })
      .toBuffer();

    // If the synthetic image is somehow already small, still exercise optimize.
    expect(big.length).toBeGreaterThan(100_000);

    const out = await optimizeAvatarBuffer(big);
    expect(out.buffer.length).toBeLessThanOrEqual(AVATAR_MAX_BYTES);
    expect(["image/png", "image/webp"]).toContain(out.contentType);
  }, 20_000);

  it("accepts a small PNG whose File.type is empty", async () => {
    const png = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 4,
        background: { r: 20, g: 180, b: 80, alpha: 0.8 },
      },
    })
      .png()
      .toBuffer();

    const { detectAvatarMime } = await import("./detect");
    const emptyType = new File([png], "sticker.png", { type: "" });
    const mime = detectAvatarMime(
      new Uint8Array(await emptyType.arrayBuffer()),
      emptyType.type,
      emptyType.name,
    );
    expect(mime).toBe("image/png");

    const out = await optimizeAvatarBuffer(png);
    expect(out.buffer.length).toBeLessThanOrEqual(AVATAR_MAX_BYTES);
  });
});

import sharp from "sharp";
import {
  AVATAR_MAX_BYTES,
  AVATAR_MAX_EDGE,
} from "@/lib/avatar/constants";

const EDGE_STEPS = [AVATAR_MAX_EDGE, 384, 320, 256, 192, 160] as const;
const WEBP_QUALITIES = [85, 72, 58, 45, 35] as const;

export type OptimizedAvatar = {
  buffer: Buffer;
  contentType: "image/png" | "image/webp";
};

/**
 * Server-side sticker normalize with sharp: resize + PNG palette / WebP
 * quality ladder until ≤ AVATAR_MAX_BYTES. Palette PNG is the same idea as
 * browser compressors (color quantization), not ML.
 */
export async function optimizeAvatarBuffer(
  input: Buffer,
): Promise<OptimizedAvatar> {
  for (const edge of EDGE_STEPS) {
    const base = sharp(input, { failOn: "none" })
      .rotate()
      .resize(edge, edge, { fit: "inside", withoutEnlargement: true });

    // Quantized PNG (great for stickers / flat graphics).
    const png = await base
      .clone()
      .png({ compressionLevel: 9, palette: true, quality: 80, effort: 7 })
      .toBuffer();
    if (png.length <= AVATAR_MAX_BYTES) {
      // Copy out of sharp's possibly SharedArrayBuffer-backed memory —
      // undici/fetch (used by @vercel/blob) rejects SAB BodyInit.
      return { buffer: Buffer.from(png), contentType: "image/png" };
    }

    for (const quality of WEBP_QUALITIES) {
      const webp = await base
        .clone()
        .webp({
          quality,
          alphaQuality: Math.min(100, quality + 10),
          effort: 4,
        })
        .toBuffer();
      if (webp.length <= AVATAR_MAX_BYTES) {
        return { buffer: Buffer.from(webp), contentType: "image/webp" };
      }
    }
  }

  throw new Error(
    "No pudimos dejar el sticker bajo 500 KB. Prueba una imagen más simple.",
  );
}

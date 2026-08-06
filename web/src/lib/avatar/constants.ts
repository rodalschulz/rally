/** Final stored sticker size (after client + server optimize). */
export const AVATAR_MAX_BYTES = 500 * 1024;

/**
 * Max raw file the user may pick. Larger sources are rejected before decode.
 * Typical phone PNGs (~3 MB) are fine; we then compress under AVATAR_MAX_BYTES.
 */
export const AVATAR_MAX_SOURCE_BYTES = 12 * 1024 * 1024;

/** Longest edge after prepare / optimize (keeps stickers light). */
export const AVATAR_MAX_EDGE = 512;

export const AVATAR_ALLOWED_TYPES = new Set([
  "image/png",
  "image/webp",
]);

export function avatarExtension(mime: string): "png" | "webp" | null {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return null;
}

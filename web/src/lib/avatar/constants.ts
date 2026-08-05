/** Max upload size before client resize / server reject. */
export const AVATAR_MAX_BYTES = 500 * 1024;

/** Longest edge after client prepare (keeps stickers light). */
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

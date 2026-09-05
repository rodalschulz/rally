import { AVATAR_ALLOWED_TYPES } from "@/lib/avatar/constants";

export type AvatarMime = "image/png" | "image/webp";

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

/**
 * Windows / some pickers leave File.type empty (or octet-stream) for a
 * perfectly valid PNG/WebP. Next server actions can also drop the MIME.
 * Bytes win; filename / hinted type are only fallbacks when the head is short.
 */
export function detectAvatarMime(
  bytes: Uint8Array,
  hintedType?: string | null,
  filename?: string | null,
): AvatarMime | null {
  if (isPng(bytes)) return "image/png";
  if (isWebp(bytes)) return "image/webp";
  if (bytes.length >= 12) return null;

  const hinted = normalizeHintedType(hintedType);
  if (hinted) return hinted;

  const name = (filename ?? "").toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  return null;
}

function normalizeHintedType(type?: string | null): AvatarMime | null {
  if (!type) return null;
  const lower = type.toLowerCase();
  if (AVATAR_ALLOWED_TYPES.has(lower)) return lower as AvatarMime;
  if (lower === "image/x-png") return "image/png";
  return null;
}

function isPng(bytes: Uint8Array): boolean {
  return (
    bytes.length >= PNG_MAGIC.length &&
    PNG_MAGIC.every((b, i) => bytes[i] === b)
  );
}

function isWebp(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

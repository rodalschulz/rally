import { AVATAR_MAX_BYTES } from "@/lib/avatar/constants";
import type { AvatarMime } from "@/lib/avatar/detect";
import type { OptimizedAvatar } from "@/lib/avatar/optimize";

const TOO_HEAVY =
  "No pudimos dejar el sticker bajo 500 KB. Prueba una imagen más simple.";

/**
 * Client already shrinks stickers to ≤ 500 KB. Do not load `sharp` in that
 * path — Vercel linux-x64 often fails to dlopen libvips and the raw error
 * was showing in Ajustes.
 *
 * Sharp is only attempted for oversized uploads (local / non-Vercel).
 */
export async function toStoredAvatar(
  input: Buffer,
  mime: AvatarMime,
): Promise<OptimizedAvatar> {
  if (input.length <= AVATAR_MAX_BYTES) {
    return { buffer: Buffer.from(input), contentType: mime };
  }

  try {
    const { optimizeAvatarBuffer } = await import("@/lib/avatar/optimize");
    return await optimizeAvatarBuffer(input);
  } catch (err) {
    if (isSharpRuntimeError(err)) {
      throw new Error(TOO_HEAVY);
    }
    throw err;
  }
}

export function isSharpRuntimeError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /sharp|libvips|ERR_DLOPEN_FAILED|linux-x64 runtime|external module sharp/i.test(
    message,
  );
}

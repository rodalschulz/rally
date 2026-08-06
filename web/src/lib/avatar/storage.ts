import { del, put } from "@vercel/blob";
import {
  AVATAR_ALLOWED_TYPES,
  AVATAR_MAX_SOURCE_BYTES,
  avatarExtension,
} from "@/lib/avatar/constants";
import { optimizeAvatarBuffer } from "@/lib/avatar/optimize";

function assertBlobConfigured() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "Falta BLOB_READ_WRITE_TOKEN. Configúralo en .env / Vercel (Storage → Blob).",
    );
  }
}

export async function uploadAvatarBlob(
  userId: string,
  file: File,
): Promise<string> {
  assertBlobConfigured();

  if (!AVATAR_ALLOWED_TYPES.has(file.type)) {
    throw new Error("Usa un PNG o WebP (sticker con fondo transparente).");
  }
  if (file.size > AVATAR_MAX_SOURCE_BYTES) {
    throw new Error("La imagen es demasiado grande (máx. 12 MB).");
  }
  if (!avatarExtension(file.type)) {
    throw new Error("Formato no soportado.");
  }

  const input = Buffer.from(await file.arrayBuffer());
  const optimized = await optimizeAvatarBuffer(input);
  const ext = optimized.contentType === "image/webp" ? "webp" : "png";

  const blob = await put(`avatars/${userId}.${ext}`, optimized.buffer, {
    access: "public",
    addRandomSuffix: true,
    contentType: optimized.contentType,
  });
  return blob.url;
}

/** Best-effort delete; ignores missing tokens / already-gone blobs. */
export async function deleteAvatarBlob(url: string | null | undefined) {
  if (!url || !process.env.BLOB_READ_WRITE_TOKEN) return;
  try {
    await del(url);
  } catch {
    // Orphan blob is acceptable; don't block profile updates.
  }
}

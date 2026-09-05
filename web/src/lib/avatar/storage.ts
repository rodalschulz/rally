import { del, put } from "@vercel/blob";
import { AVATAR_MAX_SOURCE_BYTES } from "@/lib/avatar/constants";
import { detectAvatarMime } from "@/lib/avatar/detect";
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
  file: Blob,
): Promise<string> {
  assertBlobConfigured();

  if (file.size > AVATAR_MAX_SOURCE_BYTES) {
    throw new Error("La imagen es demasiado grande (máx. 12 MB).");
  }

  const input = Buffer.from(await file.arrayBuffer());
  const filename = "name" in file ? String((file as File).name) : "";
  if (!detectAvatarMime(input, file.type, filename)) {
    throw new Error("Usa un PNG o WebP (sticker con fondo transparente).");
  }
  const optimized = await optimizeAvatarBuffer(input);
  const ext = optimized.contentType === "image/webp" ? "webp" : "png";

  // Blob + copied bytes: @vercel/blob put() uses fetch/undici, which throws
  // "ArrayBuffer: SharedArrayBuffer is not allowed" on sharp's raw buffers.
  const body = new Blob([new Uint8Array(optimized.buffer)], {
    type: optimized.contentType,
  });
  const blob = await put(`avatars/${userId}.${ext}`, body, {
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

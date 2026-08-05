import { del, put } from "@vercel/blob";
import {
  AVATAR_ALLOWED_TYPES,
  AVATAR_MAX_BYTES,
  avatarExtension,
} from "@/lib/avatar/constants";

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
  if (file.size > AVATAR_MAX_BYTES) {
    throw new Error("La imagen debe pesar menos de 300 KB.");
  }

  const ext = avatarExtension(file.type);
  if (!ext) {
    throw new Error("Formato no soportado.");
  }

  const blob = await put(`avatars/${userId}.${ext}`, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type,
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

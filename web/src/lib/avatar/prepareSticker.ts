import {
  AVATAR_ALLOWED_TYPES,
  AVATAR_MAX_BYTES,
  AVATAR_MAX_EDGE,
} from "@/lib/avatar/constants";

/**
 * Client-side: validate + downscale to a PNG sticker ≤ max edge / size.
 * Keeps uploads small without a server image pipeline.
 */
export async function prepareStickerFile(file: File): Promise<File> {
  if (!AVATAR_ALLOWED_TYPES.has(file.type)) {
    throw new Error("Usa un PNG o WebP (sticker con fondo transparente).");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(
      1,
      AVATAR_MAX_EDGE / Math.max(bitmap.width, bitmap.height),
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo procesar la imagen.");
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("No se pudo exportar PNG."))),
        "image/png",
      );
    });

    if (blob.size > AVATAR_MAX_BYTES) {
      throw new Error(
        "El sticker sigue pesando demasiado (máx. 300 KB). Prueba una imagen más simple.",
      );
    }

    return new File([blob], "sticker.png", { type: "image/png" });
  } finally {
    bitmap.close();
  }
}

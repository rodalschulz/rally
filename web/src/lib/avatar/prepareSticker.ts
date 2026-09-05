import {
  AVATAR_MAX_BYTES,
  AVATAR_MAX_EDGE,
  AVATAR_MAX_SOURCE_BYTES,
} from "@/lib/avatar/constants";
import { detectAvatarMime, type AvatarMime } from "@/lib/avatar/detect";

const EDGE_STEPS = [AVATAR_MAX_EDGE, 384, 320, 256, 192, 160] as const;
/** WebP quality ladder — preserves alpha, usually lands well under 500 KB. */
const WEBP_QUALITIES = [0.88, 0.72, 0.58, 0.45, 0.35] as const;

/**
 * Client-side: validate + resize/re-encode so a large PNG/WebP (e.g. ~3 MB)
 * becomes a sticker ≤ AVATAR_MAX_BYTES. Prefers PNG when it already fits;
 * otherwise WebP quality steps, then smaller edges.
 *
 * MIME is sniffed from bytes — Windows often leaves File.type empty.
 * Files already under the cap are passed through (canvas can inflate a PNG
 * and then fail the 500 KB check undeservedly).
 */
export async function prepareStickerFile(file: File): Promise<File> {
  if (file.size > AVATAR_MAX_SOURCE_BYTES) {
    throw new Error("La imagen es demasiado grande (máx. 12 MB).");
  }

  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const mime = detectAvatarMime(head, file.type, file.name);
  if (!mime) {
    throw new Error("Usa un PNG o WebP (sticker con fondo transparente).");
  }

  if (file.size <= AVATAR_MAX_BYTES) {
    return asStickerFile(file, mime);
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("No se pudo leer la imagen. Prueba otro PNG o WebP.");
  }

  try {
    for (const edge of EDGE_STEPS) {
      const { width, height } = fitInside(bitmap.width, bitmap.height, edge);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No se pudo procesar la imagen.");
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(bitmap, 0, 0, width, height);

      const png = await canvasToBlob(canvas, "image/png");
      if (png && png.size <= AVATAR_MAX_BYTES) {
        return asStickerFile(png, "image/png");
      }

      for (const quality of WEBP_QUALITIES) {
        const webp = await canvasToBlob(canvas, "image/webp", quality);
        if (webp && isWebpBlob(webp) && webp.size <= AVATAR_MAX_BYTES) {
          return asStickerFile(webp, "image/webp");
        }
      }
    }

    throw new Error(
      "No pudimos dejar el sticker bajo 500 KB. Prueba una imagen más simple.",
    );
  } finally {
    bitmap.close();
  }
}

function asStickerFile(source: Blob, mime: AvatarMime): File {
  const ext = mime === "image/webp" ? "webp" : "png";
  return new File([source], `sticker.${ext}`, { type: mime });
}

function isWebpBlob(blob: Blob): boolean {
  return blob.type === "image/webp" || blob.type === "";
}

function fitInside(
  srcW: number,
  srcH: number,
  maxEdge: number,
): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(srcW, srcH));
  return {
    width: Math.max(1, Math.round(srcW * scale)),
    height: Math.max(1, Math.round(srcH * scale)),
  };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), type, quality);
  });
}

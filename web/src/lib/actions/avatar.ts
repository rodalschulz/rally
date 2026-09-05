"use server";

import { unstable_update } from "@/auth";
import { deleteAvatarBlob, uploadAvatarBlob } from "@/lib/avatar/storage";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/groups";
import { revalidatePath } from "next/cache";

export type AvatarActionResult =
  | { ok: true; avatarUrl: string | null }
  | { ok: false; error: string };

function revalidateAvatarPaths() {
  revalidatePath("/");
  revalidatePath("/ajustes");
  revalidatePath("/grupos", "layout");
}

export async function uploadAvatarAction(
  formData: FormData,
): Promise<AvatarActionResult> {
  const userId = await requireUserId();
  const file = asUploadedBlob(formData.get("file"));
  if (!file) {
    return { ok: false, error: "Elige una imagen." };
  }

  try {
    const previous = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    const avatarUrl = await uploadAvatarBlob(userId, file);
    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });
    await deleteAvatarBlob(previous?.avatarUrl);
    await unstable_update({ user: { avatarUrl } });
    revalidateAvatarPaths();
    return { ok: true, avatarUrl };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "No se pudo subir el sticker.";
    return { ok: false, error: message };
  }
}

export async function removeAvatarAction(): Promise<AvatarActionResult> {
  const userId = await requireUserId();
  try {
    const previous = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
    });
    await deleteAvatarBlob(previous?.avatarUrl);
    await unstable_update({ user: { avatarUrl: null } });
    revalidateAvatarPaths();
    return { ok: true, avatarUrl: null };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "No se pudo quitar el sticker.";
    return { ok: false, error: message };
  }
}

/** Next server actions sometimes give a Blob, not a cross-realm File. */
function asUploadedBlob(value: FormDataEntryValue | null): Blob | null {
  if (typeof Blob !== "undefined" && value instanceof Blob && value.size > 0) {
    return value;
  }
  if (
    value &&
    typeof value === "object" &&
    "size" in value &&
    typeof (value as { size: unknown }).size === "number" &&
    (value as { size: number }).size > 0 &&
    "arrayBuffer" in value &&
    typeof (value as { arrayBuffer: unknown }).arrayBuffer === "function"
  ) {
    return value as Blob;
  }
  return null;
}

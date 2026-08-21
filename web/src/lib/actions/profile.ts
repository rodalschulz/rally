"use server";

import { signOut, unstable_update } from "@/auth";
import { deleteAvatarBlob, uploadAvatarBlob } from "@/lib/avatar/storage";
import {
  normalizePaymentPhone,
  parsePaymentWallet,
} from "@/lib/debts/paymentProfile";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/groups";
import { deleteUserAccount } from "@/lib/groups/membership";
import { deriveShortName } from "@/lib/user-profile";
import {
  HOME_GROUP_COOKIE,
  parseHomeGroupSlug,
} from "@/lib/pwa/home-group";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type AvatarActionResult =
  | { ok: true; avatarUrl: string | null }
  | { ok: false; error: string };

function revalidateAvatarPaths() {
  revalidatePath("/");
  revalidatePath("/ajustes");
  revalidatePath("/grupos", "layout");
}

async function userSettingsPath(): Promise<string> {
  const slug = parseHomeGroupSlug(
    (await cookies()).get(HOME_GROUP_COOKIE)?.value,
  );
  return slug ? `/grupos/${slug}/cuenta` : "/ajustes";
}

export async function updateProfileAction(formData: FormData) {
  const userId = await requireUserId();
  const displayName = String(formData.get("displayName") || "").trim();
  if (!displayName || displayName.length < 2) {
    throw new Error("Nombre muy corto");
  }
  if (displayName.length > 40) {
    throw new Error("Nombre muy largo");
  }

  const phoneRaw = String(formData.get("paymentPhone") || "");
  const phoneNormalized = normalizePaymentPhone(phoneRaw);
  if (phoneRaw.trim() && !phoneNormalized) {
    throw new Error("Celular inválido. Usa 9 dígitos (ej. 987654321).");
  }

  const walletRaw = String(formData.get("paymentWallet") || "");
  let paymentWallet = parsePaymentWallet(walletRaw);
  if (phoneNormalized && !paymentWallet) {
    paymentWallet = "either";
  }
  if (!phoneNormalized) {
    paymentWallet = null;
  }

  const shortName = deriveShortName(displayName);
  await prisma.user.update({
    where: { id: userId },
    data: {
      displayName,
      shortName,
      paymentPhone: phoneNormalized,
      paymentWallet,
    },
  });

  await unstable_update({
    user: { displayName, shortName },
  });

  revalidatePath("/");
  revalidatePath("/ajustes");
  revalidatePath("/grupos", "layout");
  redirect(await userSettingsPath());
}

export async function uploadAvatarAction(
  formData: FormData,
): Promise<AvatarActionResult> {
  const userId = await requireUserId();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
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

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function deleteAccountAction() {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarUrl: true },
  });
  await deleteUserAccount(userId);
  await deleteAvatarBlob(user?.avatarUrl);
  await signOut({ redirectTo: "/login" });
}

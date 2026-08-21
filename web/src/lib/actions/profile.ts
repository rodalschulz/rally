"use server";

import { signOut, unstable_update } from "@/auth";
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
  const { deleteAvatarBlob } = await import("@/lib/avatar/storage");
  await deleteAvatarBlob(user?.avatarUrl);
  await signOut({ redirectTo: "/login" });
}

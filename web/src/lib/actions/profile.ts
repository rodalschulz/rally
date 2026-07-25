"use server";

import { signOut, unstable_update } from "@/auth";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/groups";
import { deleteUserAccount } from "@/lib/groups/membership";
import { deriveShortName } from "@/lib/user-profile";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateProfileAction(formData: FormData) {
  const userId = await requireUserId();
  const displayName = String(formData.get("displayName") || "").trim();
  if (!displayName || displayName.length < 2) {
    throw new Error("Nombre muy corto");
  }
  if (displayName.length > 40) {
    throw new Error("Nombre muy largo");
  }

  const shortName = deriveShortName(displayName);
  await prisma.user.update({
    where: { id: userId },
    data: { displayName, shortName },
  });

  await unstable_update({
    user: { displayName, shortName },
  });

  revalidatePath("/");
  revalidatePath("/ajustes");
  redirect("/ajustes");
}

export async function deleteAccountAction() {
  const userId = await requireUserId();
  await deleteUserAccount(userId);
  await signOut({ redirectTo: "/login" });
}

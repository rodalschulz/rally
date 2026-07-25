"use server";

import {
  createGroup,
  joinPublicGroup,
  joinViaInvite,
  requireUserId,
  updateGroupSettings,
} from "@/lib/groups";
import { deleteGroup, leaveGroup } from "@/lib/groups/membership";
import type { GroupVisibility } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createGroupAction(formData: FormData) {
  const userId = await requireUserId();
  const name = String(formData.get("name") || "");
  const description = String(formData.get("description") || "");
  const visibility = String(formData.get("visibility") || "private") as GroupVisibility;
  const password = String(formData.get("password") || "");
  const maxMembersRaw = Number(formData.get("maxMembers") || "20");

  const group = await createGroup({
    name,
    description: description || undefined,
    visibility: visibility === "public" ? "public" : "private",
    password: password || undefined,
    maxMembers: Number.isFinite(maxMembersRaw) ? maxMembersRaw : 20,
    userId,
  });

  revalidatePath("/");
  redirect(`/grupos/${group.slug}`);
}

export async function updateGroupAction(formData: FormData) {
  const userId = await requireUserId();
  const groupId = String(formData.get("groupId") || "");
  const slug = String(formData.get("slug") || "");
  const name = String(formData.get("name") || "");
  const maxMembers = Number(formData.get("maxMembers") || "0");
  const password = String(formData.get("password") || "");

  await updateGroupSettings({
    groupId,
    userId,
    name,
    maxMembers,
    password: password || undefined,
  });

  revalidatePath("/");
  revalidatePath(`/grupos/${slug}`);
  revalidatePath(`/grupos/${slug}/ajustes`);
  redirect(`/grupos/${slug}`);
}

export async function joinPublicGroupAction(formData: FormData) {
  const userId = await requireUserId();
  const groupId = String(formData.get("groupId") || "");
  try {
    const group = await joinPublicGroup(groupId, userId);
    revalidatePath("/");
    redirect(`/grupos/${group.slug}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No se pudo unir";
    redirect(`/?error=${encodeURIComponent(msg)}`);
  }
}

export async function joinViaInviteAction(formData: FormData) {
  const userId = await requireUserId();
  const inviteCode = String(formData.get("inviteCode") || "");
  const password = String(formData.get("password") || "");

  try {
    const group = await joinViaInvite({
      inviteCode,
      userId,
      password: password || undefined,
    });
    revalidatePath("/");
    redirect(`/grupos/${group.slug}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No se pudo unir";
    redirect(`/join/${inviteCode}?error=${encodeURIComponent(msg)}`);
  }
}

export async function leaveGroupAction(formData: FormData) {
  const userId = await requireUserId();
  const groupId = String(formData.get("groupId") || "");
  if (!groupId) throw new Error("Grupo inválido");

  await leaveGroup(groupId, userId);

  revalidatePath("/");
  redirect("/");
}

export async function deleteGroupAction(formData: FormData) {
  const userId = await requireUserId();
  const groupId = String(formData.get("groupId") || "");
  if (!groupId) throw new Error("Grupo inválido");

  await deleteGroup(groupId, userId);

  revalidatePath("/");
  redirect("/");
}

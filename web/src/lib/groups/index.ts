import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  hashGroupPassword,
  makeSlug,
  newInviteCode,
  verifyGroupPassword,
} from "@/lib/groups/crypto";
import type { Group, GroupMember, GroupVisibility } from "@prisma/client";
import { notFound, redirect } from "next/navigation";

export type GroupWithRole = Group & { membership: GroupMember };

const DEFAULT_MAX_MEMBERS = 20;
const MIN_MAX_MEMBERS = 2;
const ABS_MAX_MEMBERS = 200;

export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

export async function listPublicGroups() {
  return prisma.group.findMany({
    where: { visibility: "public" },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { members: true } } },
  });
}

export async function listMyGroups(userId: string) {
  return prisma.groupMember.findMany({
    where: { userId },
    include: {
      group: { include: { _count: { select: { members: true } } } },
    },
    orderBy: { joinedAt: "desc" },
  });
}

export async function getGroupBySlug(slug: string) {
  return prisma.group.findUnique({ where: { slug } });
}

export async function getGroupByInviteCode(code: string) {
  return prisma.group.findUnique({ where: { inviteCode: code } });
}

export async function getMembership(groupId: string, userId: string) {
  return prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
}

/** Member gate for group hub routes. */
export async function requireGroupMember(slug: string): Promise<GroupWithRole> {
  const userId = await requireUserId();
  const group = await getGroupBySlug(slug);
  if (!group) notFound();

  const membership = await getMembership(group.id, userId);
  if (!membership) {
    redirect(`/join/${group.inviteCode}`);
  }

  return { ...group, membership };
}

export async function requireGroupOwner(slug: string): Promise<GroupWithRole> {
  const group = await requireGroupMember(slug);
  if (group.membership.role !== "owner") {
    redirect(`/grupos/${slug}`);
  }
  return group;
}

function parseMaxMembers(raw: number | undefined): number {
  const n = Math.floor(raw ?? DEFAULT_MAX_MEMBERS);
  if (!Number.isFinite(n) || n < MIN_MAX_MEMBERS || n > ABS_MAX_MEMBERS) {
    throw new Error(
      `Máximo de miembros inválido (${MIN_MAX_MEMBERS}–${ABS_MAX_MEMBERS})`,
    );
  }
  return n;
}

/** Throws if a new membership would exceed maxMembers. Existing members pass. */
export async function assertGroupHasCapacity(
  groupId: string,
  userId: string,
): Promise<void> {
  const existing = await getMembership(groupId, userId);
  if (existing) return;

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { _count: { select: { members: true } } },
  });
  if (!group) throw new Error("Grupo no encontrado");
  if (group._count.members >= group.maxMembers) {
    throw new Error("El grupo ya está lleno");
  }
}

export async function createGroup(input: {
  name: string;
  description?: string;
  visibility: GroupVisibility;
  password?: string;
  maxMembers?: number;
  userId: string;
}) {
  const name = input.name.trim();
  if (!name) throw new Error("Nombre requerido");

  if (input.visibility === "private") {
    if (!input.password || input.password.length < 4) {
      throw new Error("Contraseña requerida (mín. 4 caracteres)");
    }
  }

  const maxMembers = parseMaxMembers(input.maxMembers);
  const slug = makeSlug(name);
  const inviteCode = newInviteCode();
  const passwordHash =
    input.visibility === "private" && input.password
      ? hashGroupPassword(input.password)
      : null;

  return prisma.group.create({
    data: {
      name,
      slug,
      description: input.description?.trim() || null,
      visibility: input.visibility,
      passwordHash,
      inviteCode,
      maxMembers,
      createdById: input.userId,
      members: {
        create: {
          userId: input.userId,
          role: "owner",
        },
      },
    },
  });
}

export async function updateGroupSettings(input: {
  groupId: string;
  userId: string;
  name: string;
  maxMembers: number;
}) {
  const membership = await getMembership(input.groupId, input.userId);
  if (!membership || membership.role !== "owner") {
    throw new Error("Solo el dueño puede editar el grupo");
  }

  const name = input.name.trim();
  if (!name) throw new Error("Nombre requerido");
  const maxMembers = parseMaxMembers(input.maxMembers);

  const memberCount = await prisma.groupMember.count({
    where: { groupId: input.groupId },
  });
  if (maxMembers < memberCount) {
    throw new Error(
      `Ya hay ${memberCount} miembros; el máximo no puede ser menor`,
    );
  }

  return prisma.group.update({
    where: { id: input.groupId },
    data: { name, maxMembers },
  });
}

export async function joinPublicGroup(groupId: string, userId: string) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) throw new Error("Grupo no encontrado");
  if (group.visibility !== "public") {
    throw new Error("Este grupo es privado — usa el link de invitación");
  }

  await assertGroupHasCapacity(groupId, userId);

  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId, userId } },
    create: { groupId, userId, role: "member" },
    update: {},
  });

  return group;
}

export async function joinViaInvite(input: {
  inviteCode: string;
  userId: string;
  password?: string;
}) {
  const group = await getGroupByInviteCode(input.inviteCode);
  if (!group) throw new Error("Invitación inválida");

  if (group.visibility === "private") {
    if (!group.passwordHash) throw new Error("Grupo mal configurado");
    if (!input.password || !verifyGroupPassword(input.password, group.passwordHash)) {
      throw new Error("Contraseña incorrecta");
    }
  }

  await assertGroupHasCapacity(group.id, input.userId);

  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: group.id, userId: input.userId } },
    create: { groupId: group.id, userId: input.userId, role: "member" },
    update: {},
  });

  return group;
}

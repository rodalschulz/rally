import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

async function scrubUserFromGroupSessions(
  tx: Tx,
  groupId: string,
  userId: string,
) {
  const sessions = await tx.playSession.findMany({
    where: { groupId },
    select: { id: true, allowedUserIds: true },
  });
  if (sessions.length === 0) return;

  const sessionIds = sessions.map((s) => s.id);
  await tx.attendance.deleteMany({
    where: { userId, playSessionId: { in: sessionIds } },
  });

  for (const s of sessions) {
    if (!s.allowedUserIds.includes(userId)) continue;
    await tx.playSession.update({
      where: { id: s.id },
      data: {
        allowedUserIds: s.allowedUserIds.filter((id) => id !== userId),
      },
    });
  }
}

/**
 * Leave a group inside an existing transaction.
 * - Sole member → deletes the group (cascades fechas/deudas/matches).
 * - Owner with others → promotes earliest other member, then leaves.
 * - Member → removes membership.
 */
export async function leaveGroupInTx(
  tx: Tx,
  groupId: string,
  userId: string,
): Promise<{ deletedGroup: boolean }> {
  const membership = await tx.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership) {
    throw new Error("No eres miembro de este grupo");
  }

  const members = await tx.groupMember.findMany({
    where: { groupId },
    orderBy: { joinedAt: "asc" },
  });

  await scrubUserFromGroupSessions(tx, groupId, userId);

  if (members.length === 1) {
    await tx.group.delete({ where: { id: groupId } });
    return { deletedGroup: true };
  }

  if (membership.role === "owner") {
    const successor = members.find((m) => m.userId !== userId);
    if (!successor) {
      throw new Error("No hay a quién transferir el dueño");
    }
    await tx.groupMember.update({
      where: { id: successor.id },
      data: { role: "owner" },
    });
    await tx.group.update({
      where: { id: groupId },
      data: { createdById: successor.userId },
    });
  }

  await tx.groupMember.delete({ where: { id: membership.id } });
  return { deletedGroup: false };
}

export async function leaveGroup(groupId: string, userId: string) {
  return prisma.$transaction((tx) => leaveGroupInTx(tx, groupId, userId));
}

/** Owner deletes the whole group (cascades fechas, deudas, matches, members). */
export async function deleteGroup(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership) {
    throw new Error("No eres miembro de este grupo");
  }
  if (membership.role !== "owner") {
    throw new Error("Solo el dueño puede eliminar el grupo");
  }

  await prisma.group.delete({ where: { id: groupId } });
}

/** Wipe user and all ownership/debt constraints that block delete. */
export async function deleteUserAccount(userId: string) {
  await prisma.$transaction(async (tx) => {
    const memberships = await tx.groupMember.findMany({
      where: { userId },
      select: { groupId: true },
    });

    for (const { groupId } of memberships) {
      await leaveGroupInTx(tx, groupId, userId);
    }

    await tx.debt.deleteMany({
      where: {
        OR: [{ fromUserId: userId }, { toUserId: userId }],
      },
    });

    // Sessions still pointing at this user (shouldn't remain after leave, but safe)
    const leftoverSessions = await tx.playSession.findMany({
      where: {
        OR: [{ financierId: userId }, { createdById: userId }],
      },
      select: { id: true },
    });
    if (leftoverSessions.length > 0) {
      await tx.playSession.deleteMany({
        where: { id: { in: leftoverSessions.map((s) => s.id) } },
      });
    }

    const stillCreator = await tx.group.findMany({
      where: { createdById: userId },
      select: { id: true },
    });
    if (stillCreator.length > 0) {
      await tx.group.deleteMany({
        where: { id: { in: stillCreator.map((g) => g.id) } },
      });
    }

    const matches = await tx.match.findMany({
      where: {
        OR: [{ sideA: { has: userId } }, { sideB: { has: userId } }],
      },
      select: { id: true, sideA: true, sideB: true },
    });
    for (const m of matches) {
      await tx.match.update({
        where: { id: m.id },
        data: {
          sideA: m.sideA.filter((id) => id !== userId),
          sideB: m.sideB.filter((id) => id !== userId),
        },
      });
    }

    await tx.user.delete({ where: { id: userId } });
  });
}

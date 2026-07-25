import { prisma } from "@/lib/db";
import {
  toAttendance,
  toDebt,
  toMatch,
  toPlayer,
  toSession,
} from "@/lib/mappers";

export async function listGroupPlayers(groupId: string) {
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: true },
    orderBy: { user: { displayName: "asc" } },
  });
  return members.map((m) => toPlayer(m.user));
}

export async function listPlaySessions(groupId: string) {
  return prisma.playSession.findMany({
    where: { groupId },
    orderBy: { startsAt: "desc" },
    include: {
      attendances: true,
      financier: true,
    },
  });
}

export async function getPlaySession(id: string, groupId?: string) {
  return prisma.playSession.findFirst({
    where: groupId ? { id, groupId } : { id },
    include: {
      attendances: { include: { user: true } },
      debts: true,
      matches: { orderBy: { createdAt: "asc" } },
      financier: true,
      group: true,
    },
  });
}

export async function listAllDebts(groupId: string) {
  const rows = await prisma.debt.findMany({
    where: { playSession: { groupId } },
  });
  return rows.map(toDebt);
}

export async function listMatches(groupId: string) {
  const rows = await prisma.match.findMany({
    where: { playSession: { groupId } },
  });
  return rows.map(toMatch);
}

export { toAttendance, toDebt, toMatch, toPlayer, toSession };

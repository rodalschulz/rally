import { prisma } from "@/lib/db";
import {
  toAttendance,
  toDebt,
  toMatch,
  toPlayer,
  toSession,
} from "@/lib/mappers";

export async function listPlayers() {
  const users = await prisma.user.findMany({ orderBy: { displayName: "asc" } });
  return users.map(toPlayer);
}

export async function listPlaySessions() {
  return prisma.playSession.findMany({
    orderBy: { startsAt: "desc" },
    include: {
      attendances: true,
      financier: true,
    },
  });
}

export async function getPlaySession(id: string) {
  return prisma.playSession.findUnique({
    where: { id },
    include: {
      attendances: { include: { user: true } },
      debts: true,
      matches: { orderBy: { createdAt: "asc" } },
      financier: true,
    },
  });
}

export async function listAttendancesForSessions(sessionIds: string[]) {
  if (sessionIds.length === 0) return [];
  const rows = await prisma.attendance.findMany({
    where: { playSessionId: { in: sessionIds } },
  });
  return rows.map(toAttendance);
}

export async function listOpenDebts() {
  const rows = await prisma.debt.findMany({
    where: { status: "open" },
    include: { fromUser: true, toUser: true },
  });
  return rows.map(toDebt);
}

export async function listAllDebts() {
  const rows = await prisma.debt.findMany();
  return rows.map(toDebt);
}

export async function listMatches() {
  const rows = await prisma.match.findMany();
  return rows.map(toMatch);
}

export { toAttendance, toDebt, toMatch, toPlayer, toSession };

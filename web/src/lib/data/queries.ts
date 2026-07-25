import { prisma } from "@/lib/db";
import {
  toAttendance,
  toDebt,
  toMatch,
  toPlayer,
  toSession,
} from "@/lib/mappers";
import type { ChatMessageDTO } from "@/lib/sessions/chat";

export async function listGroupPlayers(groupId: string) {
  const members = await listGroupMembers(groupId);
  return members.map((m) => m.player);
}

export async function listGroupMembers(groupId: string) {
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: true },
    orderBy: { user: { displayName: "asc" } },
  });
  // Owners first, then A–Z by name
  return members
    .map((m) => ({
      player: toPlayer(m.user),
      role: m.role as "owner" | "member",
    }))
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === "owner" ? -1 : 1;
      return a.player.displayName.localeCompare(b.player.displayName, "es");
    });
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

/** Matches that count for ranking: only fechas already in the past. */
export async function listRankingMatches(groupId: string) {
  const rows = await prisma.match.findMany({
    where: {
      playSession: {
        groupId,
        startsAt: { lt: new Date() },
      },
    },
  });
  return rows.map(toMatch);
}

export async function listSessionChatMessages(
  playSessionId: string,
): Promise<ChatMessageDTO[]> {
  const rows = await prisma.sessionChatMessage.findMany({
    where: { playSessionId },
    orderBy: { createdAt: "asc" },
    include: { user: true },
  });
  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    createdAt: r.createdAt.toISOString(),
    userId: r.userId,
    displayName: r.user.displayName || r.user.name || "Jugador",
    shortName:
      r.user.shortName ||
      (r.user.displayName || r.user.name || "J").slice(0, 2).toUpperCase(),
    hue: r.user.hue,
  }));
}

export { toAttendance, toDebt, toMatch, toPlayer, toSession };

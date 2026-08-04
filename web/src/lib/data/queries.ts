import { prisma } from "@/lib/db";
import {
  toAttendance,
  toDebt,
  toMatch,
  toPlayer,
  toSession,
} from "@/lib/mappers";
import type { MatchChangeLogEntry } from "@/lib/matches/changelog";

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
    include: {
      playSession: { select: { startsAt: true, courtLabel: true } },
    },
    orderBy: [{ playSession: { startsAt: "desc" } }, { createdAt: "asc" }],
  });
  return rows.map((row) => ({
    ...toDebt(row),
    sessionStartsAt: row.playSession.startsAt.toISOString(),
    sessionCourtLabel: row.playSession.courtLabel ?? undefined,
  }));
}

export async function listMatches(groupId: string) {
  const rows = await prisma.match.findMany({
    where: { playSession: { groupId }, deletedAt: null },
  });
  return rows.map(toMatch);
}

/** Matches that count for ranking: past fechas with a winner (not En curso / deleted). */
export async function listRankingMatches(groupId: string) {
  const rows = await prisma.match.findMany({
    where: {
      winnerSide: { not: null },
      deletedAt: null,
      playSession: {
        groupId,
        startsAt: { lt: new Date() },
      },
    },
    include: { playSession: { select: { startsAt: true } } },
    orderBy: [
      { playSession: { startsAt: "asc" } },
      { createdAt: "asc" },
    ],
  });
  return rows.map(toMatch);
}

export async function listSessionMatchChangeLogs(
  playSessionId: string,
): Promise<MatchChangeLogEntry[]> {
  const rows = await prisma.matchChangeLog.findMany({
    where: { playSessionId },
    orderBy: { createdAt: "desc" },
    include: {
      actor: { select: { id: true, displayName: true, name: true } },
      match: { select: { id: true, deletedAt: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    matchId: row.matchId,
    actorId: row.actorId,
    actorDisplayName: row.actor.displayName || row.actor.name || "Jugador",
    action: row.action,
    unit: row.unit,
    summary: row.summary,
    createdAt: row.createdAt.toISOString(),
    restorable:
      row.action === "deleted" &&
      Boolean(row.matchId) &&
      row.match?.deletedAt != null,
  }));
}

export { toAttendance, toDebt, toMatch, toPlayer, toSession };

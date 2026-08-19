import { prisma } from "@/lib/db";
import type { DebtWithSession } from "@/lib/domain/types";
import {
  toAttendance,
  toDebt,
  toMatch,
  toPlayer,
  toSession,
} from "@/lib/mappers";
import type { MatchChangeLogEntry } from "@/lib/matches/changelog";
import { sessionPastCutoff } from "@/lib/sessions/windows";

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
      joinedAt: m.joinedAt.toISOString(),
    }))
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === "owner" ? -1 : 1;
      return a.player.displayName.localeCompare(b.player.displayName, "es");
    });
}

const hubSessionInclude = { attendances: true } as const;

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

/** Próximas Fechas: still inside the results window, not cancelled. */
export async function listUpcomingPlaySessions(groupId: string, now = new Date()) {
  return prisma.playSession.findMany({
    where: {
      groupId,
      status: { not: "cancelled" },
      startsAt: { gt: sessionPastCutoff(now) },
    },
    orderBy: { startsAt: "asc" },
    include: hubSessionInclude,
  });
}

/** Fechas Pasadas, newest first. Pass `take` for the hub preview. */
export async function listPastPlaySessions(
  groupId: string,
  opts?: { take?: number; now?: Date },
) {
  return prisma.playSession.findMany({
    where: {
      groupId,
      status: { not: "cancelled" },
      startsAt: { lte: sessionPastCutoff(opts?.now) },
    },
    orderBy: { startsAt: "desc" },
    take: opts?.take,
    include: hubSessionInclude,
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

const debtSessionSelect = {
  playSession: { select: { startsAt: true, courtLabel: true } },
} as const;

function toDebtWithSession(
  row: Parameters<typeof toDebt>[0] & {
    playSession: { startsAt: Date; courtLabel: string | null };
  },
): DebtWithSession {
  return {
    ...toDebt(row),
    sessionStartsAt: row.playSession.startsAt.toISOString(),
    sessionCourtLabel: row.playSession.courtLabel ?? undefined,
  };
}

export async function listOpenDebts(groupId: string): Promise<DebtWithSession[]> {
  const rows = await prisma.debt.findMany({
    where: { status: "open", playSession: { groupId } },
    include: debtSessionSelect,
    orderBy: [{ playSession: { startsAt: "desc" } }, { createdAt: "asc" }],
  });
  return rows.map(toDebtWithSession);
}

/** Saldadas, newest settled first. Pass `take` for the Historial preview. */
export async function listSettledDebts(
  groupId: string,
  opts?: { take?: number },
): Promise<DebtWithSession[]> {
  const rows = await prisma.debt.findMany({
    where: { status: "settled", playSession: { groupId } },
    include: debtSessionSelect,
    orderBy: [
      { settledAt: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    take: opts?.take,
  });
  return rows.map(toDebtWithSession);
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

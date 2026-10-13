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

/**
 * Group id (after the membership gate) or slug, so a page can start its
 * queries in the same round trip as `requireGroupMember`.
 */
export type GroupKey = string | { slug: string };

function groupWhere(
  key: GroupKey,
): { groupId: string } | { group: { slug: string } } {
  return typeof key === "string" ? { groupId: key } : { group: { slug: key.slug } };
}

export async function listGroupPlayers(group: GroupKey) {
  const members = await listGroupMembers(group);
  return members.map((m) => m.player);
}

export async function countGroupMembers(group: GroupKey) {
  return prisma.groupMember.count({ where: groupWhere(group) });
}

export async function listGroupMembers(group: GroupKey) {
  const members = await prisma.groupMember.findMany({
    where: groupWhere(group),
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

export async function listPlaySessions(group: GroupKey) {
  return prisma.playSession.findMany({
    where: groupWhere(group),
    orderBy: { startsAt: "desc" },
    include: {
      attendances: true,
      financier: true,
    },
  });
}

/** Próximas Fechas: still inside the results window, not cancelled. */
export async function listUpcomingPlaySessions(group: GroupKey, now = new Date()) {
  return prisma.playSession.findMany({
    where: {
      ...groupWhere(group),
      status: { not: "cancelled" },
      startsAt: { gt: sessionPastCutoff(now) },
    },
    orderBy: { startsAt: "asc" },
    include: hubSessionInclude,
  });
}

/** Fechas Pasadas, newest first. Pass `take` for the hub preview. */
export async function listPastPlaySessions(
  group: GroupKey,
  opts?: { take?: number; now?: Date },
) {
  return prisma.playSession.findMany({
    where: {
      ...groupWhere(group),
      status: { not: "cancelled" },
      startsAt: { lte: sessionPastCutoff(opts?.now) },
    },
    orderBy: { startsAt: "desc" },
    take: opts?.take,
    include: hubSessionInclude,
  });
}

export async function getPlaySession(id: string, group?: GroupKey) {
  return prisma.playSession.findFirst({
    where: group ? { id, ...groupWhere(group) } : { id },
    include: {
      attendances: true,
      matches: { orderBy: { createdAt: "asc" } },
      financier: true,
      recogeBolasPayer: true,
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

export async function listOpenDebts(group: GroupKey): Promise<DebtWithSession[]> {
  const rows = await prisma.debt.findMany({
    where: {
      status: "open",
      playSession: {
        ...groupWhere(group),
        status: { not: "cancelled" },
        startsAt: { lte: sessionPastCutoff() },
      },
    },
    include: debtSessionSelect,
    orderBy: [{ playSession: { startsAt: "desc" } }, { createdAt: "asc" }],
  });
  return rows.map(toDebtWithSession);
}

/** Saldadas, newest settled first. Pass `take` for the Historial preview. */
export async function listSettledDebts(
  group: GroupKey,
  opts?: { take?: number },
): Promise<DebtWithSession[]> {
  const rows = await prisma.debt.findMany({
    where: { status: "settled", playSession: groupWhere(group) },
    include: debtSessionSelect,
    orderBy: [
      { settledAt: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    take: opts?.take,
  });
  return rows.map(toDebtWithSession);
}

export async function listMatches(group: GroupKey) {
  const rows = await prisma.match.findMany({
    where: { playSession: groupWhere(group), deletedAt: null },
  });
  return rows.map(toMatch);
}

/**
 * Matches that count for ranking: a winner, not deleted.
 * Default window is fechas that already started. `throughStartsAt` caps the
 * history at one fecha (that fecha and earlier) so a single Fecha does not
 * pull later results it will not use.
 */
export async function listRankingMatches(
  group: GroupKey,
  opts?: { throughStartsAt?: Date },
) {
  const rows = await prisma.match.findMany({
    where: {
      winnerSide: { not: null },
      deletedAt: null,
      playSession: {
        ...groupWhere(group),
        startsAt: opts?.throughStartsAt
          ? { lte: opts.throughStartsAt }
          : { lt: new Date() },
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

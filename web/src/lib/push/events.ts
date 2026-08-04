import type { AttendanceStatus } from "@prisma/client";
import { listRankingMatches } from "@/lib/data/queries";
import { prisma } from "@/lib/db";
import { buildEloRanking } from "@/lib/ranking/elo";
import { isMaterialFechaUpdate } from "./fechaDiff";
import {
  attendanceStatusLabel,
  displayNameOf,
  formatFechaWhen,
} from "./format";
import { detectLeaderChange, leaderIdFromRows } from "./leader";
import { recipientsForFechaAudience } from "./recipients";
import { sendPushToUser, sendPushToUsers } from "./send";

export { isMaterialFechaUpdate };

async function groupMemberIds(groupId: string): Promise<string[]> {
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    select: { userId: true },
  });
  return members.map((m) => m.userId);
}

async function loadGroupMeta(groupId: string) {
  return prisma.group.findUnique({
    where: { id: groupId },
    select: { id: true, slug: true, name: true },
  });
}

/** Current Singles Games (Elo.G) leader for a group, or null. */
export async function getSinglesGamesLeaderId(
  groupId: string,
): Promise<string | null> {
  const [matches, members] = await Promise.all([
    listRankingMatches(groupId),
    prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true },
    }),
  ]);
  const memberIds = members.map((m) => m.userId);
  const rows = buildEloRanking(matches, "game", memberIds);
  // Only treat as a leader if someone has actually played.
  if (!rows.some((r) => r.played > 0)) return null;
  return leaderIdFromRows(rows);
}

/**
 * After a Singles Games mutation, notify previous + new #1 if the leader changed.
 */
export async function notifySinglesGamesLeaderChanged(args: {
  groupId: string;
  previousLeaderId: string | null;
  actorId: string;
}): Promise<void> {
  const nextLeaderId = await getSinglesGamesLeaderId(args.groupId);
  const change = detectLeaderChange(args.previousLeaderId, nextLeaderId);
  if (!change) return;

  const group = await loadGroupMeta(args.groupId);
  if (!group) return;

  const users = await prisma.user.findMany({
    where: { id: { in: [change.previousId, change.nextId] } },
    select: { id: true, displayName: true, name: true },
  });
  const nameById = new Map(
    users.map((u) => [u.id, displayNameOf(u)] as const),
  );
  const url = `/grupos/${group.slug}/rankings/singles?unit=game`;

  await Promise.all([
    sendPushToUser(
      change.previousId,
      {
        title: `${group.name} · Ranking`,
        body: `${nameById.get(change.nextId) ?? "Alguien"} te quitó el 1.er puesto (Singles Games)`,
        url,
      },
      "rankingLeaderChanged",
      { excludeUserIds: [args.actorId] },
    ),
    sendPushToUser(
      change.nextId,
      {
        title: `${group.name} · Ranking`,
        body: `Quedaste 1.er puesto en Singles Games`,
        url,
      },
      "rankingLeaderChanged",
      { excludeUserIds: [args.actorId] },
    ),
  ]);
}

export async function notifyFechaCreated(args: {
  groupId: string;
  playSessionId: string;
  startsAt: Date;
  allowedUserIds: string[];
  actorId: string;
}): Promise<void> {
  const group = await loadGroupMeta(args.groupId);
  if (!group) return;
  const members = await groupMemberIds(args.groupId);
  const audience = recipientsForFechaAudience(members, args.allowedUserIds);
  const actor = await prisma.user.findUnique({
    where: { id: args.actorId },
    select: { displayName: true, name: true },
  });

  await sendPushToUsers(
    audience,
    {
      title: `${group.name} · Nueva fecha`,
      body: `${displayNameOf(actor)} creó una fecha · ${formatFechaWhen(args.startsAt)}`,
      url: `/grupos/${group.slug}/sessions/${args.playSessionId}`,
    },
    "fechaCreated",
    { excludeUserIds: [args.actorId] },
  );
}

export async function notifyFechaUpdated(args: {
  groupId: string;
  playSessionId: string;
  startsAt: Date;
  allowedUserIds: string[];
  actorId: string;
}): Promise<void> {
  const group = await loadGroupMeta(args.groupId);
  if (!group) return;
  const members = await groupMemberIds(args.groupId);
  const audience = recipientsForFechaAudience(members, args.allowedUserIds);

  await sendPushToUsers(
    audience,
    {
      title: `${group.name} · Fecha actualizada`,
      body: `Se actualizó la fecha · ${formatFechaWhen(args.startsAt)}`,
      url: `/grupos/${group.slug}/sessions/${args.playSessionId}`,
    },
    "fechaUpdated",
    { excludeUserIds: [args.actorId] },
  );
}

export async function notifyFechaDeleted(args: {
  groupId: string;
  startsAt: Date;
  allowedUserIds: string[];
  actorId: string;
}): Promise<void> {
  const group = await loadGroupMeta(args.groupId);
  if (!group) return;
  const members = await groupMemberIds(args.groupId);
  const audience = recipientsForFechaAudience(members, args.allowedUserIds);

  await sendPushToUsers(
    audience,
    {
      title: `${group.name} · Fecha borrada`,
      body: `Se eliminó la fecha del ${formatFechaWhen(args.startsAt)}`,
      url: `/grupos/${group.slug}`,
    },
    "fechaDeleted",
    { excludeUserIds: [args.actorId] },
  );
}

export async function notifyAttendanceChanged(args: {
  groupId: string;
  playSessionId: string;
  startsAt: Date;
  subjectId: string;
  status: AttendanceStatus;
  actorId: string;
}): Promise<void> {
  const group = await loadGroupMeta(args.groupId);
  if (!group) return;
  const members = await groupMemberIds(args.groupId);
  const subject = await prisma.user.findUnique({
    where: { id: args.subjectId },
    select: { displayName: true, name: true },
  });
  const who = displayNameOf(subject);
  const label = attendanceStatusLabel(args.status);

  await sendPushToUsers(
    members,
    {
      title: `${group.name} · Asistencia`,
      body: `${who}: ${label} · ${formatFechaWhen(args.startsAt)}`,
      url: `/grupos/${group.slug}/sessions/${args.playSessionId}`,
    },
    "attendanceChanged",
    { excludeUserIds: [args.actorId] },
  );
}

/** Notify group members when a Game or Set is newly created (not edit/delete). */
export async function notifyResultAdded(args: {
  groupId: string;
  playSessionId: string;
  actorId: string;
  unit: "game" | "set";
  summary: string;
}): Promise<void> {
  const group = await loadGroupMeta(args.groupId);
  if (!group) return;
  const members = await groupMemberIds(args.groupId);
  const unitLabel = args.unit === "game" ? "Game" : "Set";

  await sendPushToUsers(
    members,
    {
      title: `${group.name} · ${unitLabel}`,
      body: args.summary,
      url: `/grupos/${group.slug}/sessions/${args.playSessionId}`,
    },
    "resultAdded",
    { excludeUserIds: [args.actorId] },
  );
}

export async function notifyDebtSettled(args: {
  groupId: string;
  playSessionId: string;
  fromUserId: string;
  toUserId: string;
  amount: { toString(): string } | number;
  actorId: string;
}): Promise<void> {
  const group = await loadGroupMeta(args.groupId);
  if (!group) return;

  const otherId =
    args.actorId === args.fromUserId
      ? args.toUserId
      : args.actorId === args.toUserId
        ? args.fromUserId
        : null;

  // Admin settle → notify both parties (excluding actor if they are one).
  const recipients =
    otherId != null
      ? [otherId]
      : [args.fromUserId, args.toUserId];

  const actor = await prisma.user.findUnique({
    where: { id: args.actorId },
    select: { displayName: true, name: true },
  });
  const amount = Number(args.amount).toFixed(2);

  await sendPushToUsers(
    recipients,
    {
      title: `${group.name} · Deuda saldada`,
      body: `${displayNameOf(actor)} marcó S/ ${amount} como saldada`,
      url: `/grupos/${group.slug}/deudas`,
    },
    "debtSettled",
    { excludeUserIds: [args.actorId] },
  );
}

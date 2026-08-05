"use server";

import { auth } from "@/auth";
import type { AttendanceStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { actionErrorMessage } from "@/lib/action-errors";
import { syncOpenDebtsForSession } from "@/lib/debts/sync";
import { canSettleDebt } from "@/lib/debts/permissions";
import { userIsAppAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import type { Match as DomainMatch } from "@/lib/domain/types";
import { getMembership } from "@/lib/groups";
import { toMatch } from "@/lib/mappers";
import {
  formatMatchChangeSummary,
  snapshotFromMatch,
  type MatchChangeAction,
  type MatchChangeLogEntry,
  type MatchSnapshot,
} from "@/lib/matches/changelog";
import {
  canChangeAttendance,
  canDeletePlaySession,
  canEditPlaySession,
} from "@/lib/sessions/permissions";
import { isSessionGamesOpen, isSessionPast } from "@/lib/sessions/windows";
import {
  getSinglesGamesLeaderId,
  isMaterialFechaUpdate,
  notifyAttendanceChanged,
  notifyDebtSettled,
  notifyFechaCreated,
  notifyFechaDeleted,
  notifyFechaUpdated,
  notifyResultAdded,
  notifySinglesGamesLeaderChanged,
} from "@/lib/push";
import {
  appZonedParts,
  fromAppZonedDateTime,
  parseAppDatetimeLocal,
} from "@/lib/timezone";

function schedulePush(task: () => Promise<void>) {
  // Pass the Promise itself so Next/Vercel waitUntil keeps the lambda alive
  // until web-push finishes (voiding inside after() drops the work early).
  after(
    task().catch((err) => {
      console.error("[push] notify failed", err);
    }),
  );
}

function scheduleSinglesGamesLeaderCheck(
  groupId: string,
  actorId: string,
  previousLeaderId: string | null,
) {
  schedulePush(() =>
    notifySinglesGamesLeaderChanged({
      groupId,
      previousLeaderId,
      actorId,
    }),
  );
}

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");
  return session.user.id;
}

async function requireMemberOfGroup(groupId: string, userId: string) {
  const m = await getMembership(groupId, userId);
  if (!m) throw new Error("No eres miembro de este grupo");
  return m;
}

async function groupPaths(groupId: string) {
  const g = await prisma.group.findUnique({ where: { id: groupId } });
  if (!g) return { slug: "" };
  return { slug: g.slug };
}

export async function setAttendanceAction(
  playSessionId: string,
  status: AttendanceStatus,
  /** When set by an app admin, change this member's RSVP instead of the actor's. */
  targetUserId?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const actorId = await requireUserId();
    const session = await prisma.playSession.findUnique({
      where: { id: playSessionId },
      include: { attendances: true },
    });
    if (!session) return { ok: false, error: "Fecha no encontrada" };
    await requireMemberOfGroup(session.groupId, actorId);

    const isAppAdmin = await userIsAppAdmin(actorId);
    const subjectId =
      targetUserId && targetUserId !== actorId ? targetUserId : actorId;

    if (subjectId !== actorId && !isAppAdmin) {
      return {
        ok: false,
        error: "Solo un admin puede cambiar la asistencia de otros",
      };
    }

    // Fechas Pasadas are immutable — including for app admins.
    if (!canChangeAttendance(session.startsAt)) {
      return {
        ok: false,
        error: "Esta fecha ya pasó — la asistencia no se puede cambiar",
      };
    }

    if (subjectId !== actorId) {
      const subjectMember = await getMembership(session.groupId, subjectId);
      if (!subjectMember) {
        return { ok: false, error: "Ese usuario no es miembro del grupo" };
      }
    }

    const allowed = session.allowedUserIds ?? [];
    if (
      allowed.length > 0 &&
      !allowed.includes(subjectId) &&
      !isAppAdmin
    ) {
      return {
        ok: false,
        error: "No estás en la lista de asistentes de esta fecha",
      };
    }

    if (status === "going") {
      const alreadyGoing = session.attendances.some(
        (a) => a.userId === subjectId && a.status === "going",
      );
      if (!alreadyGoing && session.maxAttendees != null) {
        const goingCount = session.attendances.filter((a) => {
          if (a.status !== "going") return false;
          if (allowed.length > 0 && !allowed.includes(a.userId)) return false;
          return true;
        }).length;
        if (goingCount >= session.maxAttendees) {
          return { ok: false, error: "Cupo completo" };
        }
      }
    }

    await prisma.attendance.upsert({
      where: {
        playSessionId_userId: { playSessionId, userId: subjectId },
      },
      create: { playSessionId, userId: subjectId, status },
      update: { status },
    });

    await syncOpenDebtsForSession(playSessionId);
    const { slug } = await groupPaths(session.groupId);
    revalidatePath(`/grupos/${slug}`);
    revalidatePath(`/grupos/${slug}/sessions/${playSessionId}`, "page");
    revalidatePath(`/grupos/${slug}/deudas`);

    schedulePush(() =>
      notifyAttendanceChanged({
        groupId: session.groupId,
        playSessionId,
        startsAt: session.startsAt,
        subjectId,
        status,
        actorId,
      }),
    );

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: actionErrorMessage(e, "No se pudo actualizar"),
    };
  }
}

function parseSessionFields(formData: FormData, creatorId: string) {
  const startsAtRaw = String(formData.get("startsAt") || "");
  const courtLabel = String(formData.get("courtLabel") || "").trim() || null;
  const costRaw = String(formData.get("costAmount") || "0");
  const note = String(formData.get("note") || "").trim() || null;
  const costAmount = Number(costRaw);

  if (!startsAtRaw || Number.isNaN(costAmount) || costAmount < 0) {
    throw new Error("Datos inválidos");
  }

  let startsAt: Date;
  try {
    startsAt = parseAppDatetimeLocal(startsAtRaw);
  } catch {
    throw new Error("Fecha inválida");
  }
  if (Number.isNaN(startsAt.getTime())) {
    throw new Error("Fecha inválida");
  }
  // Fechas always start on the hour (ignore picker minutes).
  {
    const p = appZonedParts(startsAt);
    startsAt = fromAppZonedDateTime(p.year, p.month, p.day, p.hour, 0, 0);
  }

  const maxRaw = String(formData.get("maxAttendees") || "").trim();
  let maxAttendees: number | null = null;
  if (maxRaw) {
    maxAttendees = Math.floor(Number(maxRaw));
    if (!Number.isFinite(maxAttendees) || maxAttendees < 1 || maxAttendees > 99) {
      throw new Error("Máximo de asistentes inválido");
    }
  }

  const allowedUserIds = [
    ...new Set(
      formData
        .getAll("allowedUserIds")
        .map((v) => String(v).trim())
        .filter(Boolean),
    ),
  ];
  if (allowedUserIds.length > 0 && !allowedUserIds.includes(creatorId)) {
    allowedUserIds.push(creatorId);
  }

  if (
    maxAttendees != null &&
    allowedUserIds.length > 0 &&
    maxAttendees > allowedUserIds.length
  ) {
    throw new Error(
      "El cupo no puede ser mayor que los asistentes permitidos",
    );
  }

  const financierCoversAll =
    formData.get("financierCoversAll") === "on" ||
    formData.get("financierCoversAll") === "true";

  return {
    startsAt,
    courtLabel,
    costAmount,
    note,
    maxAttendees,
    allowedUserIds,
    financierCoversAll,
  };
}

export async function createPlaySessionAction(formData: FormData) {
  const userId = await requireUserId();
  const groupId = String(formData.get("groupId") || "");
  if (!groupId) throw new Error("Grupo inválido");
  await requireMemberOfGroup(groupId, userId);

  const fields = parseSessionFields(formData, userId);

  const created = await prisma.playSession.create({
    data: {
      groupId,
      ...fields,
      financierId: userId,
      createdById: userId,
      status: "scheduled",
      attendances: {
        create: {
          userId,
          status: "going",
        },
      },
    },
  });

  await syncOpenDebtsForSession(created.id);
  const { slug } = await groupPaths(groupId);
  revalidatePath(`/grupos/${slug}`);
  revalidatePath(`/grupos/${slug}/deudas`);

  schedulePush(() =>
    notifyFechaCreated({
      groupId,
      playSessionId: created.id,
      startsAt: created.startsAt,
      allowedUserIds: created.allowedUserIds ?? [],
      actorId: userId,
    }),
  );

  redirect(`/grupos/${slug}/sessions/${created.id}`);
}

export async function updatePlaySessionAction(formData: FormData) {
  const userId = await requireUserId();
  const playSessionId = String(formData.get("playSessionId") || "");
  if (!playSessionId) throw new Error("Fecha inválida");

  const row = await prisma.playSession.findUnique({
    where: { id: playSessionId },
  });
  if (!row) throw new Error("Fecha no encontrada");
  await requireMemberOfGroup(row.groupId, userId);
  const isAppAdmin = await userIsAppAdmin(userId);

  if (!canEditPlaySession(row, userId, { isAppAdmin })) {
    throw new Error(
      canChangeAttendance(row.startsAt)
        ? "Solo el creador o un admin puede editar esta fecha"
        : "Esta fecha ya pasó — solo un admin puede editarla",
    );
  }

  // Always anchor invite list to the original creator, not the editor.
  const fields = parseSessionFields(formData, row.createdById);
  const material = isMaterialFechaUpdate(row, fields);

  await prisma.playSession.update({
    where: { id: playSessionId },
    data: fields,
  });

  // Drop RSVPs for people no longer allowed
  if (fields.allowedUserIds.length > 0) {
    await prisma.attendance.updateMany({
      where: {
        playSessionId,
        userId: { notIn: fields.allowedUserIds },
        status: { in: ["going", "maybe"] },
      },
      data: { status: "pending" },
    });
  }

  await syncOpenDebtsForSession(playSessionId);
  const { slug } = await groupPaths(row.groupId);
  revalidatePath(`/grupos/${slug}`);
  revalidatePath(`/grupos/${slug}/sessions/${playSessionId}`);
  revalidatePath(`/grupos/${slug}/deudas`);

  if (material) {
    schedulePush(() =>
      notifyFechaUpdated({
        groupId: row.groupId,
        playSessionId,
        startsAt: fields.startsAt,
        allowedUserIds: fields.allowedUserIds,
        actorId: userId,
      }),
    );
  }

  redirect(`/grupos/${slug}/sessions/${playSessionId}`);
}

export async function settleDebtAction(formData: FormData) {
  const userId = await requireUserId();
  const debtId = String(formData.get("debtId") || "");
  if (!debtId) throw new Error("Deuda inválida");
  const debt = await prisma.debt.findUnique({
    where: { id: debtId },
    include: { playSession: true },
  });
  if (!debt) throw new Error("Deuda no encontrada");
  await requireMemberOfGroup(debt.playSession.groupId, userId);
  const isAppAdmin = await userIsAppAdmin(userId);

  if (
    !canSettleDebt({
      creditorId: debt.toUserId,
      userId,
      sessionStartsAt: debt.playSession.startsAt,
      isAppAdmin,
    })
  ) {
    throw new Error(
      !isSessionPast(debt.playSession.startsAt)
        ? "Solo se puede saldar cuando la fecha ya pasó"
        : "Solo el acreedor o un admin puede marcar la deuda como saldada",
    );
  }
  if (debt.status !== "open") {
    throw new Error("Esta deuda ya está saldada");
  }

  await prisma.debt.update({
    where: { id: debtId },
    data: {
      status: "settled",
      settledAt: new Date(),
      settledById: userId,
    },
  });
  const { slug } = await groupPaths(debt.playSession.groupId);
  revalidatePath(`/grupos/${slug}/deudas`);
  revalidatePath(`/grupos/${slug}/sessions/${debt.playSessionId}`);

  schedulePush(() =>
    notifyDebtSettled({
      groupId: debt.playSession.groupId,
      playSessionId: debt.playSessionId,
      fromUserId: debt.fromUserId,
      toUserId: debt.toUserId,
      amount: debt.amount,
      actorId: userId,
    }),
  );
}

export async function deletePlaySessionAction(formData: FormData) {
  const userId = await requireUserId();
  const playSessionId = String(formData.get("playSessionId") || "");
  if (!playSessionId) throw new Error("Fecha inválida");

  const row = await prisma.playSession.findUnique({
    where: { id: playSessionId },
  });
  if (!row) throw new Error("Fecha no encontrada");
  const membership = await requireMemberOfGroup(row.groupId, userId);
  const isGroupOwner = membership.role === "owner";
  const isAppAdmin = await userIsAppAdmin(userId);

  if (!canDeletePlaySession(row, userId, { isGroupOwner, isAppAdmin })) {
    throw new Error(
      !canChangeAttendance(row.startsAt)
        ? "Solo el admin del grupo o un admin de la app puede borrar una fecha pasada"
        : "No tienes permiso para borrar esta fecha",
    );
  }

  const { slug } = await groupPaths(row.groupId);
  // Cascades attendances, debts, and matches → ranking no longer counts them.
  await prisma.playSession.delete({ where: { id: playSessionId } });
  revalidatePath(`/grupos/${slug}`);
  revalidatePath(`/grupos/${slug}/deudas`);
  revalidatePath(`/grupos/${slug}/rankings/singles`);

  schedulePush(() =>
    notifyFechaDeleted({
      groupId: row.groupId,
      startsAt: row.startsAt,
      allowedUserIds: row.allowedUserIds ?? [],
      actorId: userId,
    }),
  );

  redirect(`/grupos/${slug}`);
}

type SinglesSidesParsed =
  | {
      ok: true;
      playSessionId: string;
      player1Id: string;
      player2Id: string;
    }
  | { ok: false; error: string };

type SinglesSetParsed =
  | {
      ok: true;
      playSessionId: string;
      player1Id: string;
      player2Id: string;
      score: string;
      winnerSide: "A" | "B" | null;
    }
  | { ok: false; error: string };

type SinglesLooseGameParsed =
  | {
      ok: true;
      playSessionId: string;
      player1Id: string;
      player2Id: string;
      winnerSide: "A" | "B";
      serverSide: "A" | "B" | null;
    }
  | { ok: false; error: string };

function parseSinglesSides(
  formData: FormData,
  noun: string,
): SinglesSidesParsed {
  const playSessionId = String(formData.get("playSessionId") || "");
  const player1Id = String(formData.get("player1Id") || "").trim();
  const player2Id = String(formData.get("player2Id") || "").trim();

  if (!playSessionId) {
    return { ok: false, error: "Fecha inválida" };
  }
  if (!player1Id || !player2Id) {
    return {
      ok: false,
      error: `Hacen falta dos jugadores distintos para registrar el ${noun}`,
    };
  }
  if (player1Id === player2Id) {
    return { ok: false, error: "Los jugadores tienen que ser distintos" };
  }
  return { ok: true, playSessionId, player1Id, player2Id };
}

function parseSinglesSetForm(formData: FormData): SinglesSetParsed {
  const sides = parseSinglesSides(formData, "set");
  if (!sides.ok) return sides;

  const games1Raw = String(formData.get("games1") ?? "").trim();
  const games2Raw = String(formData.get("games2") ?? "").trim();

  // No score yet → En curso (players only).
  if (!games1Raw && !games2Raw) {
    return {
      ok: true,
      playSessionId: sides.playSessionId,
      player1Id: sides.player1Id,
      player2Id: sides.player2Id,
      score: "",
      winnerSide: null,
    };
  }

  const games1 = Number(games1Raw);
  const games2 = Number(games2Raw);
  if (
    !Number.isInteger(games1) ||
    !Number.isInteger(games2) ||
    games1 < 0 ||
    games2 < 0 ||
    games1 > 99 ||
    games2 > 99
  ) {
    return { ok: false, error: "Marcador inválido" };
  }
  if (games1 === games2) {
    return {
      ok: false,
      error: "El set no puede empatar — tiene que haber un ganador",
    };
  }
  if (games1 < 6 && games2 < 6) {
    return {
      ok: false,
      error: "En un set al menos un lado debe llegar a 6",
    };
  }

  return {
    ok: true,
    playSessionId: sides.playSessionId,
    player1Id: sides.player1Id,
    player2Id: sides.player2Id,
    score: `${games1}-${games2}`,
    winnerSide: games1 > games2 ? "A" : "B",
  };
}

function parseOptionalServerSide(
  formData: FormData,
): { ok: true; serverSide: "A" | "B" | null } | { ok: false; error: string } {
  const raw = String(formData.get("serverSide") || "").trim();
  if (!raw) return { ok: true, serverSide: null };
  if (raw !== "A" && raw !== "B") {
    return { ok: false, error: "Servidor inválido" };
  }
  return { ok: true, serverSide: raw };
}

function parseSinglesLooseGameForm(formData: FormData): SinglesLooseGameParsed {
  const sides = parseSinglesSides(formData, "game");
  if (!sides.ok) return sides;

  const server = parseOptionalServerSide(formData);
  if (!server.ok) return server;

  const winnerSideRaw = String(formData.get("winnerSide") || "").trim();
  if (winnerSideRaw !== "A" && winnerSideRaw !== "B") {
    return { ok: false, error: "Elige quién ganó el game" };
  }

  return {
    ok: true,
    playSessionId: sides.playSessionId,
    player1Id: sides.player1Id,
    player2Id: sides.player2Id,
    winnerSide: winnerSideRaw,
    serverSide: server.serverSide,
  };
}

async function assertGoingCanManageGames(
  playSessionId: string,
  userId: string,
) {
  const session = await prisma.playSession.findUnique({
    where: { id: playSessionId },
    include: { attendances: true },
  });
  if (!session) return { ok: false as const, error: "Fecha no encontrada" };
  await requireMemberOfGroup(session.groupId, userId);

  const goingIds = new Set(
    session.attendances
      .filter((a) => a.status === "going")
      .map((a) => a.userId),
  );
  if (!goingIds.has(userId)) {
    return {
      ok: false as const,
      error: "Solo quien marcó Voy puede gestionar resultados",
    };
  }
  if (!isSessionGamesOpen(session.startsAt)) {
    return {
      ok: false as const,
      error: "Ya cerró el plazo para agregar o editar resultados",
    };
  }
  return { ok: true as const, session, goingIds };
}

async function revalidateSessionGames(groupId: string, playSessionId: string) {
  const { slug } = await groupPaths(groupId);
  // Don't block the action on cache invalidation — client already updated optimistically.
  after(() => {
    revalidatePath(`/grupos/${slug}/sessions/${playSessionId}`);
    revalidatePath(`/grupos/${slug}/rankings/singles`);
  });
}

type SinglesMutationOk = {
  ok: true;
  match: DomainMatch;
  log: MatchChangeLogEntry;
};
type SinglesMutationResult = SinglesMutationOk | { ok: false; error: string };

async function assertGoingPlayers(
  goingIds: Set<string>,
  player1Id: string,
  player2Id: string,
  noun: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!goingIds.has(player1Id) || !goingIds.has(player2Id)) {
    return {
      ok: false,
      error: `Solo asistentes (Voy) pueden jugar el ${noun}`,
    };
  }
  return { ok: true };
}

async function nameLookupForUsers(userIds: string[]) {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) {
    return (_id: string) => "?";
  }
  const users = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, displayName: true, name: true },
  });
  const map = new Map(
    users.map((u) => [u.id, u.displayName || u.name || "Jugador"] as const),
  );
  return (id: string) => map.get(id) ?? "?";
}

async function writeMatchChangeLog(opts: {
  playSessionId: string;
  matchId: string;
  actorId: string;
  action: MatchChangeAction;
  after: MatchSnapshot;
  before?: MatchSnapshot | null;
}): Promise<MatchChangeLogEntry> {
  const nameIds = [
    ...opts.after.sideA,
    ...opts.after.sideB,
    ...(opts.before?.sideA ?? []),
    ...(opts.before?.sideB ?? []),
  ];
  const nameOf = await nameLookupForUsers(nameIds);
  const summary = formatMatchChangeSummary(
    opts.action,
    opts.after,
    nameOf,
    opts.before,
  );

  const [row, actor] = await Promise.all([
    prisma.matchChangeLog.create({
      data: {
        playSessionId: opts.playSessionId,
        matchId: opts.matchId,
        actorId: opts.actorId,
        action: opts.action,
        unit: opts.after.unit,
        summary,
        ...(opts.before ? { before: opts.before } : {}),
        after: opts.after,
      },
    }),
    prisma.user.findUnique({
      where: { id: opts.actorId },
      select: { displayName: true, name: true },
    }),
  ]);

  return {
    id: row.id,
    matchId: row.matchId,
    actorId: row.actorId,
    actorDisplayName: actor?.displayName || actor?.name || "Jugador",
    action: row.action,
    unit: row.unit,
    summary: row.summary,
    createdAt: row.createdAt.toISOString(),
    restorable: opts.action === "deleted",
  };
}

export async function addSinglesSetAction(
  formData: FormData,
): Promise<SinglesMutationResult> {
  try {
    const userId = await requireUserId();
    const parsed = parseSinglesSetForm(formData);
    if (!parsed.ok) return parsed;

    const gate = await assertGoingCanManageGames(parsed.playSessionId, userId);
    if (!gate.ok) return gate;

    const playersOk = await assertGoingPlayers(
      gate.goingIds,
      parsed.player1Id,
      parsed.player2Id,
      "set",
    );
    if (!playersOk.ok) return playersOk;

    const created = await prisma.match.create({
      data: {
        playSessionId: parsed.playSessionId,
        format: "singles",
        unit: "set",
        score: parsed.score,
        winnerSide: parsed.winnerSide,
        sideA: [parsed.player1Id],
        sideB: [parsed.player2Id],
      },
    });

    const log = await writeMatchChangeLog({
      playSessionId: parsed.playSessionId,
      matchId: created.id,
      actorId: userId,
      action: "created",
      after: snapshotFromMatch(created),
    });

    await revalidateSessionGames(gate.session.groupId, parsed.playSessionId);
    schedulePush(() =>
      notifyResultAdded({
        groupId: gate.session.groupId,
        playSessionId: parsed.playSessionId,
        actorId: userId,
        unit: "set",
        summary: log.summary,
      }),
    );
    return { ok: true, match: toMatch(created), log };
  } catch (e) {
    return { ok: false, error: actionErrorMessage(e, "No se pudo guardar") };
  }
}

export async function updateSinglesSetAction(
  formData: FormData,
): Promise<SinglesMutationResult> {
  try {
    const userId = await requireUserId();
    const matchId = String(formData.get("matchId") || "");
    if (!matchId) return { ok: false, error: "Set inválido" };

    const parsed = parseSinglesSetForm(formData);
    if (!parsed.ok) return parsed;

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match || match.playSessionId !== parsed.playSessionId) {
      return { ok: false, error: "Set no encontrado" };
    }
    if (match.deletedAt) {
      return { ok: false, error: "Este set está borrado — restáuralo primero" };
    }
    if (match.format !== "singles" || match.unit !== "set") {
      return { ok: false, error: "Solo se editan sets singles" };
    }

    const gate = await assertGoingCanManageGames(parsed.playSessionId, userId);
    if (!gate.ok) return gate;

    const playersOk = await assertGoingPlayers(
      gate.goingIds,
      parsed.player1Id,
      parsed.player2Id,
      "set",
    );
    if (!playersOk.ok) return playersOk;

    const before = snapshotFromMatch(match);
    const updated = await prisma.match.update({
      where: { id: matchId },
      data: {
        score: parsed.score,
        winnerSide: parsed.winnerSide,
        sideA: [parsed.player1Id],
        sideB: [parsed.player2Id],
      },
    });

    const log = await writeMatchChangeLog({
      playSessionId: parsed.playSessionId,
      matchId: updated.id,
      actorId: userId,
      action: "updated",
      before,
      after: snapshotFromMatch(updated),
    });

    await revalidateSessionGames(gate.session.groupId, parsed.playSessionId);
    return { ok: true, match: toMatch(updated), log };
  } catch (e) {
    return { ok: false, error: actionErrorMessage(e, "No se pudo guardar") };
  }
}

export async function addSinglesLooseGameAction(
  formData: FormData,
): Promise<SinglesMutationResult> {
  try {
    const userId = await requireUserId();
    const parsed = parseSinglesLooseGameForm(formData);
    if (!parsed.ok) return parsed;

    const gate = await assertGoingCanManageGames(parsed.playSessionId, userId);
    if (!gate.ok) return gate;

    const playersOk = await assertGoingPlayers(
      gate.goingIds,
      parsed.player1Id,
      parsed.player2Id,
      "game",
    );
    if (!playersOk.ok) return playersOk;

    const previousLeaderId = await getSinglesGamesLeaderId(
      gate.session.groupId,
    );

    const created = await prisma.match.create({
      data: {
        playSessionId: parsed.playSessionId,
        format: "singles",
        unit: "game",
        score: "1-0",
        winnerSide: parsed.winnerSide,
        serverSide: parsed.serverSide,
        sideA: [parsed.player1Id],
        sideB: [parsed.player2Id],
      },
    });

    const log = await writeMatchChangeLog({
      playSessionId: parsed.playSessionId,
      matchId: created.id,
      actorId: userId,
      action: "created",
      after: snapshotFromMatch(created),
    });

    await revalidateSessionGames(gate.session.groupId, parsed.playSessionId);
    schedulePush(() =>
      notifyResultAdded({
        groupId: gate.session.groupId,
        playSessionId: parsed.playSessionId,
        actorId: userId,
        unit: "game",
        summary: log.summary,
      }),
    );
    scheduleSinglesGamesLeaderCheck(
      gate.session.groupId,
      userId,
      previousLeaderId,
    );
    return { ok: true, match: toMatch(created), log };
  } catch (e) {
    return { ok: false, error: actionErrorMessage(e, "No se pudo guardar") };
  }
}

export async function updateSinglesLooseGameAction(
  formData: FormData,
): Promise<SinglesMutationResult> {
  try {
    const userId = await requireUserId();
    const matchId = String(formData.get("matchId") || "");
    if (!matchId) return { ok: false, error: "Game inválido" };

    const parsed = parseSinglesLooseGameForm(formData);
    if (!parsed.ok) return parsed;

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match || match.playSessionId !== parsed.playSessionId) {
      return { ok: false, error: "Game no encontrado" };
    }
    if (match.deletedAt) {
      return { ok: false, error: "Este game está borrado — restáuralo primero" };
    }
    if (match.format !== "singles" || match.unit !== "game") {
      return { ok: false, error: "Solo se editan games sueltos" };
    }

    const gate = await assertGoingCanManageGames(parsed.playSessionId, userId);
    if (!gate.ok) return gate;

    const playersOk = await assertGoingPlayers(
      gate.goingIds,
      parsed.player1Id,
      parsed.player2Id,
      "game",
    );
    if (!playersOk.ok) return playersOk;

    const previousLeaderId = await getSinglesGamesLeaderId(
      gate.session.groupId,
    );

    const before = snapshotFromMatch(match);
    const updated = await prisma.match.update({
      where: { id: matchId },
      data: {
        score: "1-0",
        winnerSide: parsed.winnerSide,
        serverSide: parsed.serverSide,
        sideA: [parsed.player1Id],
        sideB: [parsed.player2Id],
      },
    });

    const log = await writeMatchChangeLog({
      playSessionId: parsed.playSessionId,
      matchId: updated.id,
      actorId: userId,
      action: "updated",
      before,
      after: snapshotFromMatch(updated),
    });

    await revalidateSessionGames(gate.session.groupId, parsed.playSessionId);
    scheduleSinglesGamesLeaderCheck(
      gate.session.groupId,
      userId,
      previousLeaderId,
    );
    return { ok: true, match: toMatch(updated), log };
  } catch (e) {
    return { ok: false, error: actionErrorMessage(e, "No se pudo guardar") };
  }
}

export async function deleteSinglesResultAction(
  formData: FormData,
): Promise<SinglesMutationResult> {
  try {
    const userId = await requireUserId();
    const matchId = String(formData.get("matchId") || "");
    if (!matchId) return { ok: false, error: "Resultado inválido" };

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return { ok: false, error: "Resultado no encontrado" };
    if (match.format !== "singles") {
      return { ok: false, error: "Solo se borran resultados singles" };
    }
    if (match.deletedAt) {
      return { ok: false, error: "Este resultado ya está borrado" };
    }

    const gate = await assertGoingCanManageGames(match.playSessionId, userId);
    if (!gate.ok) return gate;

    const previousLeaderId =
      match.unit === "game"
        ? await getSinglesGamesLeaderId(gate.session.groupId)
        : null;

    const deletedAt = new Date();
    const updated = await prisma.match.update({
      where: { id: matchId },
      data: { deletedAt, deletedById: userId },
    });

    const log = await writeMatchChangeLog({
      playSessionId: match.playSessionId,
      matchId: updated.id,
      actorId: userId,
      action: "deleted",
      after: snapshotFromMatch(updated),
    });

    await revalidateSessionGames(gate.session.groupId, match.playSessionId);
    if (match.unit === "game") {
      scheduleSinglesGamesLeaderCheck(
        gate.session.groupId,
        userId,
        previousLeaderId,
      );
    }
    return { ok: true, match: toMatch(updated), log };
  } catch (e) {
    return { ok: false, error: actionErrorMessage(e, "No se pudo borrar") };
  }
}

export async function restoreSinglesResultAction(
  formData: FormData,
): Promise<SinglesMutationResult> {
  try {
    const userId = await requireUserId();
    const matchId = String(formData.get("matchId") || "");
    if (!matchId) return { ok: false, error: "Resultado inválido" };

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return { ok: false, error: "Resultado no encontrado" };
    if (match.format !== "singles") {
      return { ok: false, error: "Solo se restauran resultados singles" };
    }
    if (!match.deletedAt) {
      return { ok: false, error: "Este resultado no está borrado" };
    }

    const gate = await assertGoingCanManageGames(match.playSessionId, userId);
    if (!gate.ok) return gate;

    const previousLeaderId =
      match.unit === "game"
        ? await getSinglesGamesLeaderId(gate.session.groupId)
        : null;

    const updated = await prisma.match.update({
      where: { id: matchId },
      data: { deletedAt: null, deletedById: null },
    });

    const log = await writeMatchChangeLog({
      playSessionId: match.playSessionId,
      matchId: updated.id,
      actorId: userId,
      action: "restored",
      after: snapshotFromMatch(updated),
    });

    await revalidateSessionGames(gate.session.groupId, match.playSessionId);
    if (match.unit === "game") {
      scheduleSinglesGamesLeaderCheck(
        gate.session.groupId,
        userId,
        previousLeaderId,
      );
    }
    return { ok: true, match: toMatch(updated), log };
  } catch (e) {
    return { ok: false, error: actionErrorMessage(e, "No se pudo restaurar") };
  }
}

/** @deprecated Prefer set/game singles actions; kept for doubles. */
export async function addMatchAction(formData: FormData) {
  const userId = await requireUserId();
  const playSessionId = String(formData.get("playSessionId") || "");
  const format = String(formData.get("format") || "doubles") as
    | "singles"
    | "doubles";
  const score = String(formData.get("score") || "").trim();
  const sideA = String(formData.get("sideA") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const sideB = String(formData.get("sideB") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!playSessionId || !score || sideA.length === 0 || sideB.length === 0) {
    throw new Error("Datos de match incompletos");
  }

  const { parseSetScore } = await import("@/lib/domain/gameScore");
  const { winnerSide } = parseSetScore(score.split(",")[0]?.trim() || score);

  const session = await prisma.playSession.findUnique({
    where: { id: playSessionId },
  });
  if (!session) throw new Error("Fecha no encontrada");
  await requireMemberOfGroup(session.groupId, userId);

  await prisma.match.create({
    data: {
      playSessionId,
      format,
      unit: "set",
      score,
      winnerSide,
      sideA,
      sideB,
    },
  });

  const { slug } = await groupPaths(session.groupId);
  revalidatePath(`/grupos/${slug}/sessions/${playSessionId}`);
  revalidatePath(`/grupos/${slug}/rankings/singles`);
}

"use server";

import { auth } from "@/auth";
import type { AttendanceStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionErrorMessage } from "@/lib/action-errors";
import { syncOpenDebtsForSession } from "@/lib/debts/sync";
import { prisma } from "@/lib/db";
import { getMembership } from "@/lib/groups";
import { parseAppDatetimeLocal } from "@/lib/timezone";

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
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const userId = await requireUserId();
    const session = await prisma.playSession.findUnique({
      where: { id: playSessionId },
      include: { attendances: true },
    });
    if (!session) return { ok: false, error: "Fecha no encontrada" };
    await requireMemberOfGroup(session.groupId, userId);

    const allowed = session.allowedUserIds ?? [];
    if (allowed.length > 0 && !allowed.includes(userId)) {
      return {
        ok: false,
        error: "No estás en la lista de asistentes de esta fecha",
      };
    }

    if (status === "going") {
      const alreadyGoing = session.attendances.some(
        (a) => a.userId === userId && a.status === "going",
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
        playSessionId_userId: { playSessionId, userId },
      },
      create: { playSessionId, userId, status },
      update: { status },
    });

    await syncOpenDebtsForSession(playSessionId);
    const { slug } = await groupPaths(session.groupId);
    revalidatePath(`/grupos/${slug}`);
    revalidatePath(`/grupos/${slug}/sessions/${playSessionId}`, "page");
    revalidatePath(`/grupos/${slug}/deudas`);
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

  return {
    startsAt,
    courtLabel,
    costAmount,
    note,
    maxAttendees,
    allowedUserIds,
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

  if (row.createdById !== userId) {
    throw new Error("Solo el creador puede editar esta fecha");
  }

  const fields = parseSessionFields(formData, userId);

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

  await prisma.debt.update({
    where: { id: debtId },
    data: { status: "settled", settledAt: new Date() },
  });
  const { slug } = await groupPaths(debt.playSession.groupId);
  revalidatePath(`/grupos/${slug}/deudas`);
  revalidatePath(`/grupos/${slug}/sessions/${debt.playSessionId}`);
}

/** Past fechas: only creator. Upcoming: creator or financier. Matches cascade on delete. */
export function canDeletePlaySession(
  row: { createdById: string; financierId: string; startsAt: Date },
  userId: string,
  now = new Date(),
): boolean {
  if (row.createdById === userId) return true;
  const isPast = row.startsAt.getTime() < now.getTime();
  if (isPast) return false;
  return row.financierId === userId;
}

export async function deletePlaySessionAction(formData: FormData) {
  const userId = await requireUserId();
  const playSessionId = String(formData.get("playSessionId") || "");
  if (!playSessionId) throw new Error("Fecha inválida");

  const row = await prisma.playSession.findUnique({
    where: { id: playSessionId },
  });
  if (!row) throw new Error("Fecha no encontrada");
  await requireMemberOfGroup(row.groupId, userId);

  if (!canDeletePlaySession(row, userId)) {
    throw new Error(
      row.startsAt.getTime() < Date.now()
        ? "Solo el creador puede borrar una fecha pasada"
        : "No tienes permiso para borrar esta fecha",
    );
  }

  const { slug } = await groupPaths(row.groupId);
  // Cascades attendances, debts, and matches → ranking no longer counts them.
  await prisma.playSession.delete({ where: { id: playSessionId } });
  revalidatePath(`/grupos/${slug}`);
  revalidatePath(`/grupos/${slug}/deudas`);
  revalidatePath(`/grupos/${slug}/rankings/singles`);
  revalidatePath(`/grupos/${slug}/rankings/doubles`);
  redirect(`/grupos/${slug}`);
}

type SinglesGameParsed =
  | {
      ok: true;
      playSessionId: string;
      player1Id: string;
      player2Id: string;
      games1: number;
      games2: number;
      score: string;
      winnerSide: "A" | "B";
    }
  | { ok: false; error: string };

function parseSinglesGameForm(formData: FormData): SinglesGameParsed {
  const playSessionId = String(formData.get("playSessionId") || "");
  const player1Id = String(formData.get("player1Id") || "").trim();
  const player2Id = String(formData.get("player2Id") || "").trim();
  const games1 = Number(formData.get("games1"));
  const games2 = Number(formData.get("games2"));

  if (!playSessionId) {
    return { ok: false, error: "Fecha inválida" };
  }
  if (!player1Id || !player2Id) {
    return {
      ok: false,
      error: "Hacen falta dos jugadores distintos para registrar el game",
    };
  }
  if (player1Id === player2Id) {
    return { ok: false, error: "Los jugadores tienen que ser distintos" };
  }
  if (
    !Number.isInteger(games1) ||
    !Number.isInteger(games2) ||
    games1 < 0 ||
    games2 < 0 ||
    games1 > 99 ||
    games2 > 99
  ) {
    return { ok: false, error: "Games inválidos" };
  }
  if (games1 === games2) {
    return {
      ok: false,
      error: "El game no puede empatar — tiene que haber un ganador",
    };
  }

  return {
    ok: true,
    playSessionId,
    player1Id,
    player2Id,
    games1,
    games2,
    score: `${games1}-${games2}`,
    winnerSide: games1 > games2 ? "A" : "B",
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
      error: "Solo quien marcó Voy puede gestionar games",
    };
  }
  return { ok: true as const, session, goingIds };
}

async function revalidateSessionGames(groupId: string, playSessionId: string) {
  const { slug } = await groupPaths(groupId);
  revalidatePath(`/grupos/${slug}/sessions/${playSessionId}`);
  revalidatePath(`/grupos/${slug}/rankings/singles`);
}

export async function addSinglesGameAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const userId = await requireUserId();
    const parsed = parseSinglesGameForm(formData);
    if (!parsed.ok) return parsed;

    const gate = await assertGoingCanManageGames(parsed.playSessionId, userId);
    if (!gate.ok) return gate;

    if (
      !gate.goingIds.has(parsed.player1Id) ||
      !gate.goingIds.has(parsed.player2Id)
    ) {
      return {
        ok: false,
        error: "Solo asistentes (Voy) pueden jugar el game",
      };
    }

    await prisma.match.create({
      data: {
        playSessionId: parsed.playSessionId,
        format: "singles",
        score: parsed.score,
        winnerSide: parsed.winnerSide,
        sideA: [parsed.player1Id],
        sideB: [parsed.player2Id],
      },
    });

    await revalidateSessionGames(gate.session.groupId, parsed.playSessionId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: actionErrorMessage(e, "No se pudo guardar") };
  }
}

export async function updateSinglesGameAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const userId = await requireUserId();
    const matchId = String(formData.get("matchId") || "");
    if (!matchId) return { ok: false, error: "Game inválido" };

    const parsed = parseSinglesGameForm(formData);
    if (!parsed.ok) return parsed;

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match || match.playSessionId !== parsed.playSessionId) {
      return { ok: false, error: "Game no encontrado" };
    }
    if (match.format !== "singles") {
      return { ok: false, error: "Solo se editan games singles" };
    }

    const gate = await assertGoingCanManageGames(parsed.playSessionId, userId);
    if (!gate.ok) return gate;

    if (
      !gate.goingIds.has(parsed.player1Id) ||
      !gate.goingIds.has(parsed.player2Id)
    ) {
      return {
        ok: false,
        error: "Solo asistentes (Voy) pueden jugar el game",
      };
    }

    await prisma.match.update({
      where: { id: matchId },
      data: {
        score: parsed.score,
        winnerSide: parsed.winnerSide,
        sideA: [parsed.player1Id],
        sideB: [parsed.player2Id],
      },
    });

    await revalidateSessionGames(gate.session.groupId, parsed.playSessionId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: actionErrorMessage(e, "No se pudo guardar") };
  }
}

export async function deleteSinglesGameAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const userId = await requireUserId();
    const matchId = String(formData.get("matchId") || "");
    if (!matchId) return { ok: false, error: "Game inválido" };

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return { ok: false, error: "Game no encontrado" };

    const gate = await assertGoingCanManageGames(match.playSessionId, userId);
    if (!gate.ok) return gate;

    await prisma.match.delete({ where: { id: matchId } });
    await revalidateSessionGames(gate.session.groupId, match.playSessionId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: actionErrorMessage(e, "No se pudo borrar") };
  }
}

/** @deprecated Prefer addSinglesGameAction for singles; kept for doubles. */
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

  const { parseGameScore } = await import("@/lib/domain/gameScore");
  const { winnerSide } = parseGameScore(score.split(",")[0]?.trim() || score);

  const session = await prisma.playSession.findUnique({
    where: { id: playSessionId },
  });
  if (!session) throw new Error("Fecha no encontrada");
  await requireMemberOfGroup(session.groupId, userId);

  await prisma.match.create({
    data: {
      playSessionId,
      format,
      score,
      winnerSide,
      sideA,
      sideB,
    },
  });

  const { slug } = await groupPaths(session.groupId);
  revalidatePath(`/grupos/${slug}/sessions/${playSessionId}`);
  revalidatePath(`/grupos/${slug}/rankings/singles`);
  revalidatePath(`/grupos/${slug}/rankings/doubles`);
}

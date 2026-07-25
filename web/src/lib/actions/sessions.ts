"use server";

import { auth } from "@/auth";
import type { AttendanceStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { syncOpenDebtsForSession } from "@/lib/debts/sync";
import { prisma } from "@/lib/db";
import { getMembership } from "@/lib/groups";

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
) {
  const userId = await requireUserId();
  const session = await prisma.playSession.findUnique({
    where: { id: playSessionId },
  });
  if (!session) throw new Error("Fecha no encontrada");
  await requireMemberOfGroup(session.groupId, userId);

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
  revalidatePath(`/grupos/${slug}/sessions/${playSessionId}`);
  revalidatePath(`/grupos/${slug}/deudas`);
}

function parseSessionFields(formData: FormData) {
  const startsAtRaw = String(formData.get("startsAt") || "");
  const courtLabel = String(formData.get("courtLabel") || "").trim() || null;
  const costRaw = String(formData.get("costAmount") || "0");
  const note = String(formData.get("note") || "").trim() || null;
  const costAmount = Number(costRaw);

  if (!startsAtRaw || Number.isNaN(costAmount) || costAmount < 0) {
    throw new Error("Datos inválidos");
  }

  const startsAt = new Date(startsAtRaw);
  if (Number.isNaN(startsAt.getTime())) {
    throw new Error("Fecha inválida");
  }

  return { startsAt, courtLabel, costAmount, note };
}

export async function createPlaySessionAction(formData: FormData) {
  const userId = await requireUserId();
  const groupId = String(formData.get("groupId") || "");
  if (!groupId) throw new Error("Grupo inválido");
  await requireMemberOfGroup(groupId, userId);

  const fields = parseSessionFields(formData);

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

  const fields = parseSessionFields(formData);

  await prisma.playSession.update({
    where: { id: playSessionId },
    data: fields,
  });

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

export async function deletePlaySessionAction(formData: FormData) {
  const userId = await requireUserId();
  const playSessionId = String(formData.get("playSessionId") || "");
  if (!playSessionId) throw new Error("Fecha inválida");

  const row = await prisma.playSession.findUnique({
    where: { id: playSessionId },
  });
  if (!row) throw new Error("Fecha no encontrada");
  await requireMemberOfGroup(row.groupId, userId);

  if (row.createdById !== userId && row.financierId !== userId) {
    throw new Error("No tienes permiso para borrar esta fecha");
  }

  const { slug } = await groupPaths(row.groupId);
  await prisma.playSession.delete({ where: { id: playSessionId } });
  revalidatePath(`/grupos/${slug}`);
  revalidatePath(`/grupos/${slug}/deudas`);
  revalidatePath(`/grupos/${slug}/rankings/singles`);
  revalidatePath(`/grupos/${slug}/rankings/doubles`);
  redirect(`/grupos/${slug}`);
}

export async function addSinglesGameAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const userId = await requireUserId();
    const playSessionId = String(formData.get("playSessionId") || "");
    const player1Id = String(formData.get("player1Id") || "").trim();
    const player2Id = String(formData.get("player2Id") || "").trim();
    const games1 = Number(formData.get("games1"));
    const games2 = Number(formData.get("games2"));

    if (!playSessionId || !player1Id || !player2Id) {
      return { ok: false, error: "Elige dos jugadores" };
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

    const session = await prisma.playSession.findUnique({
      where: { id: playSessionId },
      include: { attendances: true },
    });
    if (!session) return { ok: false, error: "Fecha no encontrada" };
    await requireMemberOfGroup(session.groupId, userId);

    const goingIds = new Set(
      session.attendances
        .filter((a) => a.status === "going")
        .map((a) => a.userId),
    );
    if (!goingIds.has(player1Id) || !goingIds.has(player2Id)) {
      return {
        ok: false,
        error: "Solo asistentes (Voy) pueden jugar el game",
      };
    }

    const score = `${games1}-${games2}`;
    const winnerSide = games1 > games2 ? "A" : "B";

    await prisma.match.create({
      data: {
        playSessionId,
        format: "singles",
        score,
        winnerSide,
        sideA: [player1Id],
        sideB: [player2Id],
      },
    });

    const { slug } = await groupPaths(session.groupId);
    revalidatePath(`/grupos/${slug}/sessions/${playSessionId}`);
    revalidatePath(`/grupos/${slug}/rankings/singles`);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo guardar",
    };
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

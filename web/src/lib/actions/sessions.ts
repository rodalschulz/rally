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

export async function addMatchAction(formData: FormData) {
  const userId = await requireUserId();
  const playSessionId = String(formData.get("playSessionId") || "");
  const format = String(formData.get("format") || "singles") as
    | "singles"
    | "doubles";
  const score = String(formData.get("score") || "").trim();
  const winnerSide = String(formData.get("winnerSide") || "A") as "A" | "B";
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

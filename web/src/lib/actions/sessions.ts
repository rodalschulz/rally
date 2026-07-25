"use server";

import { auth } from "@/auth";
import type { AttendanceStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { syncOpenDebtsForSession } from "@/lib/debts/sync";
import { prisma } from "@/lib/db";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");
  return session.user.id;
}

export async function setAttendanceAction(
  playSessionId: string,
  status: AttendanceStatus,
) {
  const userId = await requireUserId();

  await prisma.attendance.upsert({
    where: {
      playSessionId_userId: { playSessionId, userId },
    },
    create: { playSessionId, userId, status },
    update: { status },
  });

  await syncOpenDebtsForSession(playSessionId);
  revalidatePath("/");
  revalidatePath(`/sessions/${playSessionId}`);
  revalidatePath("/deudas");
}

export async function createPlaySessionAction(formData: FormData) {
  const userId = await requireUserId();

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

  const created = await prisma.playSession.create({
    data: {
      startsAt,
      courtLabel,
      costAmount,
      note,
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
  revalidatePath("/");
  revalidatePath("/deudas");
  redirect(`/sessions/${created.id}`);
}

export async function settleDebtAction(formData: FormData) {
  await requireUserId();
  const debtId = String(formData.get("debtId") || "");
  if (!debtId) throw new Error("Deuda inválida");
  const debt = await prisma.debt.update({
    where: { id: debtId },
    data: { status: "settled", settledAt: new Date() },
  });
  revalidatePath("/deudas");
  revalidatePath(`/sessions/${debt.playSessionId}`);
}

export async function deletePlaySessionAction(formData: FormData) {
  const userId = await requireUserId();
  const playSessionId = String(formData.get("playSessionId") || "");
  if (!playSessionId) throw new Error("Fecha inválida");

  const row = await prisma.playSession.findUnique({
    where: { id: playSessionId },
  });
  if (!row) throw new Error("Fecha no encontrada");

  // Creator or financier can delete
  if (row.createdById !== userId && row.financierId !== userId) {
    throw new Error("No tienes permiso para borrar esta fecha");
  }

  await prisma.playSession.delete({ where: { id: playSessionId } });
  revalidatePath("/");
  revalidatePath("/deudas");
  revalidatePath("/rankings/singles");
  revalidatePath("/rankings/doubles");
  redirect("/");
}

export async function addMatchAction(formData: FormData) {
  await requireUserId();
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

  revalidatePath(`/sessions/${playSessionId}`);
  revalidatePath("/rankings/singles");
  revalidatePath("/rankings/doubles");
}

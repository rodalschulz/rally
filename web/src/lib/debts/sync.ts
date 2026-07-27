import { computeSessionDebts } from "@/lib/domain/split";
import { prisma } from "@/lib/db";
import { toAttendance, toSession } from "@/lib/mappers";
import {
  debtEdgeKey,
  reconcileDebtsAgainstComputed,
} from "@/lib/debts/reconcile";

/**
 * Rebuild debts for a play session from current `going` RSVPs.
 * - Open debts are always rebuilt.
 * - Settled debts that still match a computed edge are kept.
 * - Settled debts that no longer apply (e.g. debtor left Voy) are deleted.
 */
export async function syncOpenDebtsForSession(playSessionId: string) {
  const session = await prisma.playSession.findUnique({
    where: { id: playSessionId },
    include: { attendances: true, debts: true },
  });
  if (!session) return;

  const computed = computeSessionDebts(
    toSession(session),
    session.attendances.map(toAttendance),
  ).map((d) => ({
    fromPlayerId: d.fromPlayerId,
    toPlayerId: d.toPlayerId,
    amount: d.amount,
  }));

  const settled = session.debts
    .filter((d) => d.status === "settled")
    .map((d) => ({
      id: d.id,
      fromPlayerId: d.fromUserId,
      toPlayerId: d.toUserId,
      amount: Number(d.amount),
    }));

  const { orphanSettledKeys, openToCreate } = reconcileDebtsAgainstComputed(
    settled,
    computed,
  );

  const orphanIds = settled
    .filter((d) => orphanSettledKeys.has(debtEdgeKey(d)))
    .map((d) => d.id);

  if (orphanIds.length > 0) {
    await prisma.debt.deleteMany({ where: { id: { in: orphanIds } } });
  }

  await prisma.debt.deleteMany({
    where: { playSessionId, status: "open" },
  });

  if (openToCreate.length === 0) return;

  await prisma.debt.createMany({
    data: openToCreate.map((d) => ({
      playSessionId,
      fromUserId: d.fromPlayerId,
      toUserId: d.toPlayerId,
      amount: d.amount,
      status: "open",
    })),
  });
}

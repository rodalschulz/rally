import { computeSessionDebts } from "@/lib/domain/split";
import { prisma } from "@/lib/db";
import { toAttendance, toSession } from "@/lib/mappers";

/** Rebuild open debts for a play session from current `going` RSVPs. */
export async function syncOpenDebtsForSession(playSessionId: string) {
  const session = await prisma.playSession.findUnique({
    where: { id: playSessionId },
    include: { attendances: true },
  });
  if (!session) return;

  await prisma.debt.deleteMany({
    where: { playSessionId, status: "open" },
  });

  const computed = computeSessionDebts(
    toSession(session),
    session.attendances.map(toAttendance),
  );

  if (computed.length === 0) return;

  await prisma.debt.createMany({
    data: computed.map((d) => ({
      playSessionId: d.sessionId,
      fromUserId: d.fromPlayerId,
      toUserId: d.toPlayerId,
      amount: d.amount,
      status: "open",
    })),
  });
}

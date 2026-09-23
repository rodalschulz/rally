import { cache } from "react";
import { prisma } from "@/lib/db";
import {
  summarizeNetOverdueForUser,
  type OverdueDebtNudge,
} from "./overdueNudge";

/**
 * Open debts the user owes, after offsetting what others owe them.
 * Only Fechas pasadas count. The nag fires when the remainder still
 * includes a fecha more than 7 calendar days old (Lima).
 */
export const loadOverdueDebtNudge = cache(
  async (userId: string): Promise<OverdueDebtNudge | null> => {
    const rows = await prisma.debt.findMany({
      where: {
        status: "open",
        playSession: { status: { not: "cancelled" } },
        OR: [{ fromUserId: userId }, { toUserId: userId }],
      },
      select: {
        id: true,
        amount: true,
        fromUserId: true,
        toUserId: true,
        playSession: {
          select: {
            startsAt: true,
            group: { select: { slug: true } },
          },
        },
      },
    });

    return summarizeNetOverdueForUser(
      rows.map((row) => ({
        id: row.id,
        fromPlayerId: row.fromUserId,
        toPlayerId: row.toUserId,
        amount: Number(row.amount),
        sessionStartsAt: row.playSession.startsAt.toISOString(),
        groupSlug: row.playSession.group.slug,
      })),
      userId,
    );
  },
);

import { cache } from "react";
import { prisma } from "@/lib/db";
import { summarizeOverdueDebts, type OverdueDebtNudge } from "./overdueNudge";

/** Open debts the user owes whose Fecha is > 7 calendar days ago (Lima). */
export const loadOverdueDebtNudge = cache(
  async (userId: string): Promise<OverdueDebtNudge | null> => {
    const rows = await prisma.debt.findMany({
      where: {
        fromUserId: userId,
        status: "open",
        playSession: { status: { not: "cancelled" } },
      },
      select: {
        amount: true,
        playSession: {
          select: {
            startsAt: true,
            group: { select: { slug: true } },
          },
        },
      },
    });

    return summarizeOverdueDebts(
      rows.map((row) => ({
        amount: Number(row.amount),
        sessionStartsAt: row.playSession.startsAt.toISOString(),
        groupSlug: row.playSession.group.slug,
      })),
    );
  },
);

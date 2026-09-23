import { roundMoney } from "@/lib/domain/split";
import { netOpenDebtPairs, type NettableDebt } from "@/lib/debts/netPairs";
import { appCalendarDayKey } from "@/lib/timezone";

/** Calendar days (America/Lima) between the fecha and today to nag. */
export const OVERDUE_OPEN_DEBT_MIN_DAYS = 7;

export const OVERDUE_DEBT_NUDGE_STORAGE_KEY = "rally:overdue-debt-nudge-dismissed";

export type OverdueDebtRow = {
  amount: number;
  sessionStartsAt: string | Date;
  groupSlug: string;
};

export type OverdueDebtNudge = {
  totalAmount: number;
  debtCount: number;
  groupSlug: string;
};

/** Whole calendar days from `from` to `to` in America/Lima (positive = to is later). */
export function calendarDaysBetween(
  from: string | Date,
  to: string | Date = new Date(),
): number {
  const fromKey = appCalendarDayKey(from);
  const toKey = appCalendarDayKey(to);
  const fromUtc = Date.parse(`${fromKey}T12:00:00Z`);
  const toUtc = Date.parse(`${toKey}T12:00:00Z`);
  return Math.round((toUtc - fromUtc) / (1000 * 60 * 60 * 24));
}

/**
 * Open debt of a Fecha that is already more than a week old
 * (calendar days in Lima). Attendance is locked by then.
 */
export function isOverdueConfirmedOpenDebt(
  sessionStartsAt: string | Date,
  now: string | Date = new Date(),
): boolean {
  return calendarDaysBetween(sessionStartsAt, now) > OVERDUE_OPEN_DEBT_MIN_DAYS;
}

export function summarizeOverdueDebts(
  rows: OverdueDebtRow[],
  now: string | Date = new Date(),
): OverdueDebtNudge | null {
  const overdue = rows.filter((row) =>
    isOverdueConfirmedOpenDebt(row.sessionStartsAt, now),
  );
  if (overdue.length === 0) return null;

  const bySlug = new Map<string, number>();
  let totalAmount = 0;
  for (const row of overdue) {
    totalAmount += row.amount;
    bySlug.set(row.groupSlug, (bySlug.get(row.groupSlug) ?? 0) + row.amount);
  }

  let groupSlug = overdue[0]!.groupSlug;
  let best = -1;
  for (const [slug, amount] of bySlug) {
    if (amount > best) {
      best = amount;
      groupSlug = slug;
    }
  }

  return {
    totalAmount: roundMoney(totalAmount),
    debtCount: overdue.length,
    groupSlug,
  };
}

export type NettableOverdueDebt = NettableDebt & { groupSlug: string };

/**
 * Nag the net debtor for the remainder, not the gross.
 * A pair that cancels does not nag. The other direction counts even when
 * that fecha is not itself older than a week.
 */
export function summarizeNetOverdueForUser(
  debts: NettableOverdueDebt[],
  userId: string,
  now: string | Date = new Date(),
): OverdueDebtNudge | null {
  const pairs = netOpenDebtPairs(
    debts.map((debt) => ({ ...debt, groupKey: debt.groupSlug })),
    new Date(now),
  );

  let totalAmount = 0;
  let debtCount = 0;
  const bySlug = new Map<string, number>();

  for (const pair of pairs) {
    if (pair.debtorId !== userId || pair.netAmount <= 0) continue;
    const overdueFechas = pair.debtorDebts.filter((debt) =>
      isOverdueConfirmedOpenDebt(debt.sessionStartsAt, now),
    );
    if (overdueFechas.length === 0) continue;
    totalAmount += pair.netAmount;
    debtCount += overdueFechas.length;
    bySlug.set(
      pair.groupKey,
      roundMoney((bySlug.get(pair.groupKey) ?? 0) + pair.netAmount),
    );
  }

  if (debtCount === 0) return null;

  let groupSlug = pairs[0]?.groupKey ?? "";
  let best = -1;
  for (const [slug, amount] of bySlug) {
    if (amount > best) {
      best = amount;
      groupSlug = slug;
    }
  }

  return {
    totalAmount: roundMoney(totalAmount),
    debtCount,
    groupSlug,
  };
}

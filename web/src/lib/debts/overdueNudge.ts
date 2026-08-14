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
    totalAmount,
    debtCount: overdue.length,
    groupSlug,
  };
}

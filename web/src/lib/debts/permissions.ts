import { isSessionPast } from "@/lib/sessions/windows";

/** Creditor-only, and only after the fecha is past (hub definition). */
export function canSettleDebt(
  opts: {
    creditorId: string;
    userId: string;
    sessionStartsAt: Date | string;
  },
  now = new Date(),
): boolean {
  if (opts.userId !== opts.creditorId) return false;
  return isSessionPast(opts.sessionStartsAt, now);
}

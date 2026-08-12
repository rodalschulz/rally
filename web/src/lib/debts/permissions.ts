import { isSessionPast } from "@/lib/sessions/windows";

/**
 * Creditor may settle after the fecha is past.
 * App admin may settle any open debt after the fecha is past (ops override).
 */
export function canSettleDebt(
  opts: {
    creditorId: string;
    userId: string;
    sessionStartsAt: Date | string;
    isAppAdmin?: boolean;
  },
  now = new Date(),
): boolean {
  if (!isSessionPast(opts.sessionStartsAt, now)) return false;
  if (opts.isAppAdmin) return true;
  return opts.userId === opts.creditorId;
}

/**
 * Debtor may claim "Ya pagué" on an open debt (transfer happened outside rally).
 */
export function canClaimDebtPaid(opts: {
  debtorId: string;
  userId: string;
  status: "open" | "settled";
}): boolean {
  return opts.status === "open" && opts.userId === opts.debtorId;
}

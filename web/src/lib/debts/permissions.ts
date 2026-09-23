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
 * Close both directions of a pair at once.
 * The net creditor confirms a remainder. Either side (or an admin) can close
 * a pair that already cancels to zero. One-direction debts stay per fecha.
 */
export function canSettleNetPair(opts: {
  debtorId: string;
  creditorId: string;
  netAmount: number;
  offset: number;
  userId: string;
  isAppAdmin?: boolean;
}): boolean {
  if (opts.offset <= 0) return false;
  if (opts.isAppAdmin) return true;
  if (opts.netAmount === 0) {
    return opts.userId === opts.debtorId || opts.userId === opts.creditorId;
  }
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

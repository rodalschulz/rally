import type { DebtWithSession } from "@/lib/domain/types";

export type DebtCounterpartyGroup = {
  /** The other party (creditor when I owe; debtor when they owe me). */
  counterpartyId: string;
  debts: DebtWithSession[];
  total: number;
};

/**
 * Group open debts by the other party for Te deben / Debes lists.
 * `role: "owed_to_me"` → group by fromPlayerId (who owes me).
 * `role: "i_owe"` → group by toPlayerId (whom I owe).
 */
export function groupDebtsByCounterparty(
  debts: DebtWithSession[],
  role: "owed_to_me" | "i_owe",
): DebtCounterpartyGroup[] {
  const map = new Map<string, DebtWithSession[]>();
  for (const d of debts) {
    const key = role === "owed_to_me" ? d.fromPlayerId : d.toPlayerId;
    const list = map.get(key);
    if (list) list.push(d);
    else map.set(key, [d]);
  }

  const groups: DebtCounterpartyGroup[] = [];
  for (const [counterpartyId, list] of map) {
    const sorted = list.slice().sort((a, b) => {
      const aMs = Date.parse(a.sessionStartsAt);
      const bMs = Date.parse(b.sessionStartsAt);
      return bMs - aMs;
    });
    groups.push({
      counterpartyId,
      debts: sorted,
      total: sorted.reduce((s, d) => s + d.amount, 0),
    });
  }

  return groups.sort((a, b) => b.total - a.total);
}

/** Open debts where the current user is neither party. */
export function othersOpenDebts(
  open: DebtWithSession[],
  me: string,
): DebtWithSession[] {
  return open.filter((d) => d.fromPlayerId !== me && d.toPlayerId !== me);
}

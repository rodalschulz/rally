import { roundMoney } from "@/lib/domain/split";

/** Stable key for a session debt edge (from → to @ amount). */
export function debtEdgeKey(d: {
  fromPlayerId: string;
  toPlayerId: string;
  amount: number;
}): string {
  return `${d.fromPlayerId}:${d.toPlayerId}:${roundMoney(d.amount).toFixed(2)}`;
}

export type DebtEdge = {
  fromPlayerId: string;
  toPlayerId: string;
  amount: number;
};

/**
 * After RSVP/cost changes: keep settled debts that still match computed,
 * drop orphans, and open only edges not already covered by a kept settled.
 */
export function reconcileDebtsAgainstComputed(
  settled: DebtEdge[],
  computed: DebtEdge[],
): {
  orphanSettledKeys: Set<string>;
  openToCreate: DebtEdge[];
} {
  const computedKeys = new Set(computed.map(debtEdgeKey));
  const orphanSettledKeys = new Set(
    settled.filter((d) => !computedKeys.has(debtEdgeKey(d))).map(debtEdgeKey),
  );
  const keptSettledKeys = new Set(
    settled.filter((d) => computedKeys.has(debtEdgeKey(d))).map(debtEdgeKey),
  );
  const openToCreate = computed.filter(
    (d) => !keptSettledKeys.has(debtEdgeKey(d)),
  );
  return { orphanSettledKeys, openToCreate };
}

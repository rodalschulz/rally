import { roundMoney, sumMoney } from "@/lib/domain/split";
import { isSessionPast } from "@/lib/sessions/windows";

/**
 * A fecha counts toward what people owe only once it is past
 * (same cutoff as the hub: court slot + results grace).
 * Rows for future fechas may already exist; they stay out of balances.
 */
export function debtCountsTowardBalance(
  sessionStartsAt: Date | string,
  now = new Date(),
): boolean {
  return isSessionPast(sessionStartsAt, now);
}

/** Open debt the caller already loaded. Do not pass settled rows. */
export type NettableDebt = {
  id: string;
  fromPlayerId: string;
  toPlayerId: string;
  amount: number;
  sessionStartsAt: string | Date;
  /**
   * Keeps two groups from netting into each other.
   * Omit when every row is already from one group.
   */
  groupKey?: string;
};

export type NetDebtPair<T extends NettableDebt = NettableDebt> = {
  groupKey: string;
  /** Who still owes after the two directions cancel. Arbitrary when net is 0. */
  debtorId: string;
  creditorId: string;
  /** Remainder to transfer. 0 when the two sides match exactly. */
  netAmount: number;
  /** Sum of open past debts in the debtor → creditor direction. */
  owedByDebtor: number;
  /** Sum cancelled from the opposite direction. */
  offset: number;
  debtorDebts: T[];
  offsetDebts: T[];
};

function bucketKey(groupKey: string, a: string, b: string): string {
  const [lo, hi] = a < b ? [a, b] : [b, a];
  return `${groupKey}\0${lo}\0${hi}`;
}

function bySessionDesc<T extends NettableDebt>(debts: T[]): T[] {
  return debts.slice().sort((a, b) => {
    const aMs = new Date(a.sessionStartsAt).getTime();
    const bMs = new Date(b.sessionStartsAt).getTime();
    return bMs - aMs;
  });
}

/**
 * Net open debts between each pair of people.
 * Each fecha stays its own row; this only decides the balance to show and pay.
 * Future fechas are ignored. A pair that cancels exactly is kept (net 0)
 * so those fechas can still be closed together.
 */
export function netOpenDebtPairs<T extends NettableDebt>(
  debts: T[],
  now = new Date(),
): NetDebtPair<T>[] {
  const buckets = new Map<string, T[]>();
  for (const debt of debts) {
    if (debt.fromPlayerId === debt.toPlayerId) continue;
    if (!(debt.amount > 0)) continue;
    if (!debtCountsTowardBalance(debt.sessionStartsAt, now)) continue;
    const key = bucketKey(debt.groupKey ?? "", debt.fromPlayerId, debt.toPlayerId);
    const list = buckets.get(key);
    if (list) list.push(debt);
    else buckets.set(key, [debt]);
  }

  const pairs: NetDebtPair<T>[] = [];
  for (const list of buckets.values()) {
    const ids = new Set<string>();
    for (const debt of list) {
      ids.add(debt.fromPlayerId);
      ids.add(debt.toPlayerId);
    }
    if (ids.size !== 2) continue;
    const [a, b] = [...ids].sort();
    const aToB = list.filter(
      (debt) => debt.fromPlayerId === a && debt.toPlayerId === b,
    );
    const bToA = list.filter(
      (debt) => debt.fromPlayerId === b && debt.toPlayerId === a,
    );
    const sumA = sumMoney(aToB.map((debt) => debt.amount));
    const sumB = sumMoney(bToA.map((debt) => debt.amount));
    if (sumA === 0 && sumB === 0) continue;

    const groupKey = list[0]?.groupKey ?? "";
    const diff = roundMoney(sumA - sumB);
    if (diff > 0) {
      pairs.push({
        groupKey,
        debtorId: a,
        creditorId: b,
        netAmount: diff,
        owedByDebtor: sumA,
        offset: sumB,
        debtorDebts: bySessionDesc(aToB),
        offsetDebts: bySessionDesc(bToA),
      });
    } else if (diff < 0) {
      pairs.push({
        groupKey,
        debtorId: b,
        creditorId: a,
        netAmount: roundMoney(-diff),
        owedByDebtor: sumB,
        offset: sumA,
        debtorDebts: bySessionDesc(bToA),
        offsetDebts: bySessionDesc(aToB),
      });
    } else {
      pairs.push({
        groupKey,
        debtorId: a,
        creditorId: b,
        netAmount: 0,
        owedByDebtor: sumA,
        offset: sumB,
        debtorDebts: bySessionDesc(aToB),
        offsetDebts: bySessionDesc(bToA),
      });
    }
  }

  return pairs.sort((a, b) => {
    if (b.netAmount !== a.netAmount) return b.netAmount - a.netAmount;
    return a.debtorId.localeCompare(b.debtorId, "es");
  });
}

export function splitNetPairsForViewer<T extends NettableDebt>(
  pairs: NetDebtPair<T>[],
  me: string,
): {
  owedToMe: NetDebtPair<T>[];
  iOwe: NetDebtPair<T>[];
  /** Both directions cancel and I am in the pair. */
  settledOff: NetDebtPair<T>[];
  others: NetDebtPair<T>[];
} {
  const owedToMe: NetDebtPair<T>[] = [];
  const iOwe: NetDebtPair<T>[] = [];
  const settledOff: NetDebtPair<T>[] = [];
  const others: NetDebtPair<T>[] = [];

  for (const pair of pairs) {
    const involvesMe = pair.debtorId === me || pair.creditorId === me;
    if (pair.netAmount === 0) {
      if (involvesMe) settledOff.push(pair);
      continue;
    }
    if (pair.creditorId === me) owedToMe.push(pair);
    else if (pair.debtorId === me) iOwe.push(pair);
    else others.push(pair);
  }

  return { owedToMe, iOwe, settledOff, others };
}

export function netPairDebtIds(pair: {
  debtorDebts: { id: string }[];
  offsetDebts: { id: string }[];
}): string[] {
  return [...pair.debtorDebts, ...pair.offsetDebts].map((debt) => debt.id);
}

export function sameDebtIdSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((id, index) => id === right[index]);
}

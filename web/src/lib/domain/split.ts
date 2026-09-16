import type { Attendance, Debt, PlayerId, Session } from "./types";

/**
 * Split court cost among `going` attendees.
 * Financiador receives debts from every other going player.
 * If financier is not going, each going player owes cost/N to the financier.
 */
export function computeSessionDebts(
  session: Session,
  attendances: Attendance[],
): Omit<Debt, "id" | "status">[] {
  if (session.financierCoversAll) return [];

  const going = attendances.filter(
    (a) => a.sessionId === session.id && a.status === "going",
  );
  const n = going.length;
  if (n === 0 || session.costAmount <= 0) return [];

  const share = roundMoney(session.costAmount / n);
  const debts: Omit<Debt, "id" | "status">[] = [];

  for (const a of going) {
    if (a.playerId === session.financierId) continue;
    debts.push({
      fromPlayerId: a.playerId,
      toPlayerId: session.financierId,
      sessionId: session.id,
      amount: share,
    });
  }

  // Edge: financier not in going → still owed full shares from each going player
  const financierGoing = going.some((a) => a.playerId === session.financierId);
  if (!financierGoing) {
    // already covered: every going player owes share; total = share * n ≈ cost
    return debts;
  }

  return debts;
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Sum then round so grouped debt totals stay at cents. */
export function sumMoney(amounts: Iterable<number>): number {
  let total = 0;
  for (const n of amounts) total += n;
  return roundMoney(total);
}

/** Parse a soles amount from form input; null if missing or invalid. */
export function parseCostAmount(raw: string): number | null {
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return roundMoney(n);
}

export function netBalances(
  debts: Debt[],
  playerIds: PlayerId[],
): Map<PlayerId, number> {
  const map = new Map<PlayerId, number>(playerIds.map((id) => [id, 0]));
  for (const d of debts) {
    if (d.status !== "open") continue;
    map.set(d.fromPlayerId, (map.get(d.fromPlayerId) ?? 0) - d.amount);
    map.set(d.toPlayerId, (map.get(d.toPlayerId) ?? 0) + d.amount);
  }
  for (const [id, amount] of map) {
    map.set(id, roundMoney(amount));
  }
  return map;
}

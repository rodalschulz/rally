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
  return map;
}

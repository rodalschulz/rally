import type { Attendance, Debt, PlayerId, Session } from "./types";

type DebtDraft = Omit<Debt, "id" | "status">;

/**
 * Split one cost among `going` attendees toward a payer.
 * If the payer is not going, each going player owes cost/N.
 */
function splitCostAmongGoing(input: {
  sessionId: string;
  amount: number;
  payerId: string;
  going: Attendance[];
}): DebtDraft[] {
  const n = input.going.length;
  if (n === 0 || input.amount <= 0) return [];

  const share = roundMoney(input.amount / n);
  const debts: DebtDraft[] = [];
  for (const a of input.going) {
    if (a.playerId === input.payerId) continue;
    debts.push({
      fromPlayerId: a.playerId,
      toPlayerId: input.payerId,
      sessionId: input.sessionId,
      amount: share,
    });
  }
  return debts;
}

function mergeDebtEdges(debts: DebtDraft[]): DebtDraft[] {
  const map = new Map<string, DebtDraft>();
  for (const d of debts) {
    const key = `${d.fromPlayerId}->${d.toPlayerId}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...d });
      continue;
    }
    prev.amount = roundMoney(prev.amount + d.amount);
  }
  return [...map.values()];
}

/**
 * Split court cost (and applied recoge bolas) among `going` attendees.
 * Financiador receives debts from every other going player.
 * Recoge bolas is a separate cost toward `recogeBolasPayerId`; same payer
 * merges into one edge. `financierCoversAll` skips only the court half.
 */
export function computeSessionDebts(
  session: Session,
  attendances: Attendance[],
): DebtDraft[] {
  const going = attendances.filter(
    (a) => a.sessionId === session.id && a.status === "going",
  );

  const court = session.financierCoversAll
    ? []
    : splitCostAmongGoing({
        sessionId: session.id,
        amount: session.costAmount,
        payerId: session.financierId,
        going,
      });

  const recogeApplied =
    Boolean(session.recogeBolasPayerId) && (session.recogeBolasAmount ?? 0) > 0;
  const recoge = recogeApplied
    ? splitCostAmongGoing({
        sessionId: session.id,
        amount: session.recogeBolasAmount ?? 0,
        payerId: session.recogeBolasPayerId ?? "",
        going,
      })
    : [];

  return mergeDebtEdges([...court, ...recoge]);
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

/**
 * Recoge bolas: extra court cost, not the reservation.
 * Any going player (or app admin) may apply amount + payer once.
 * After it is applied, only an app admin may change or clear it.
 */

export function isRecogeBolasApplied(input: {
  recogeBolasAmount?: number | null;
  recogeBolasPayerId?: string | null;
}): boolean {
  return (
    Boolean(input.recogeBolasPayerId) && (input.recogeBolasAmount ?? 0) > 0
  );
}

export function canEditRecogeBolas(input: {
  applied: boolean;
  actorIsGoing: boolean;
  isAppAdmin: boolean;
}): boolean {
  if (input.isAppAdmin) return true;
  return !input.applied && input.actorIsGoing;
}

export function resolveRecogeBolas(input: {
  currentAmount: number | null;
  currentPayerId: string | null;
  submittedAmount: number | null;
  submittedPayerId: string;
  goingIds: readonly string[];
  isAppAdmin: boolean;
  actorIsGoing: boolean;
}):
  | { ok: true; amount: number | null; payerId: string | null }
  | { ok: false; error: string } {
  const applied = isRecogeBolasApplied({
    recogeBolasAmount: input.currentAmount,
    recogeBolasPayerId: input.currentPayerId,
  });
  if (
    !canEditRecogeBolas({
      applied,
      actorIsGoing: input.actorIsGoing,
      isAppAdmin: input.isAppAdmin,
    })
  ) {
    return {
      ok: false,
      error: applied
        ? "Solo un admin puede cambiar recoge bolas"
        : "Solo quien marcó Voy puede registrar recoge bolas",
    };
  }

  const amount = input.submittedAmount;
  const payer = input.submittedPayerId.trim();

  if (amount == null || amount === 0) {
    if (!applied) {
      return { ok: false, error: "Indica cuánto costó el recoge bolas" };
    }
    if (!input.isAppAdmin) {
      return { ok: false, error: "Solo un admin puede quitar recoge bolas" };
    }
    return { ok: true, amount: null, payerId: null };
  }

  if (!payer) {
    return { ok: false, error: "Elige quién pagó el recoge bolas" };
  }

  const keepingCurrent = payer === (input.currentPayerId ?? "");
  const payerGoing = input.goingIds.includes(payer);
  if (!payerGoing && !(applied && keepingCurrent && input.isAppAdmin)) {
    return {
      ok: false,
      error: "Quien pagó tiene que haber marcado Voy",
    };
  }

  return { ok: true, amount, payerId: payer };
}

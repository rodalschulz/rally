import type { Debt } from "../domain/types";

/**
 * Historial copy: who settled + role (acreedor vs admin).
 * Role is derived from settledById === creditor (toPlayerId); only those two
 * roles can settle. Returns null when settledById is missing (legacy rows).
 */
export function settleActorLabel(
  debt: Pick<Debt, "settledById" | "toPlayerId">,
  displayNameById: ReadonlyMap<string, string>,
): string | null {
  if (!debt.settledById) return null;
  const name = displayNameById.get(debt.settledById) ?? "alguien";
  if (debt.settledById === debt.toPlayerId) {
    return `Saldó el acreedor (${name})`;
  }
  return `Saldó un admin (${name})`;
}

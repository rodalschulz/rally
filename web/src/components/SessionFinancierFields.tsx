"use client";

import { useMemo, useState } from "react";
import { FinancierCoversField } from "@/components/FinancierCoversField";
import type { Player } from "@/lib/domain/types";

export function SessionFinancierFields({
  players,
  actorId,
  defaultFinancierId,
  defaultCoversAll,
  canReassign,
  departedFinancier = null,
}: {
  players: Player[];
  actorId: string;
  defaultFinancierId: string;
  defaultCoversAll: boolean;
  /** App admin may change who paid. */
  canReassign: boolean;
  /** Current payer if they already left the group. */
  departedFinancier?: Player | null;
}) {
  const [financierId, setFinancierId] = useState(defaultFinancierId);
  const options = useMemo(() => {
    const list =
      departedFinancier && !players.some((p) => p.id === departedFinancier.id)
        ? [...players, departedFinancier]
        : players;
    return [...list].sort((a, b) =>
      a.displayName.localeCompare(b.displayName, "es"),
    );
  }, [players, departedFinancier]);

  return (
    <>
      {canReassign ? (
        <label className="block text-[0.8rem] text-muted">
          Quién pagó
          <select
            name="financierId"
            value={financierId}
            onChange={(e) => setFinancierId(e.target.value)}
            className="mt-1 w-full rounded-xl bg-sand px-3 py-3 text-ink"
          >
            {options.map((player) => (
              <option key={player.id} value={player.id}>
                {player.displayName}
                {departedFinancier?.id === player.id
                  ? " (ya no está en el grupo)"
                  : ""}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[0.75rem] text-muted">
            Las deudas de esta fecha quedan con esa persona.
          </span>
        </label>
      ) : null}
      <FinancierCoversField
        defaultChecked={defaultCoversAll}
        payerIsSelf={financierId === actorId}
      />
    </>
  );
}

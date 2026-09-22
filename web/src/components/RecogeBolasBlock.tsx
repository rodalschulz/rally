"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { applyRecogeBolasAction } from "@/lib/actions/sessions";
import { formatSoles } from "@/lib/format";

type Option = { id: string; displayName: string };

export function RecogeBolasBlock({
  playSessionId,
  amount,
  payerId,
  payerName,
  goingPlayers,
  canEdit,
  isAppAdmin,
  defaultPayerId,
  share,
}: {
  playSessionId: string;
  amount: number | null;
  payerId: string | null;
  payerName: string | null;
  goingPlayers: Option[];
  canEdit: boolean;
  isAppAdmin: boolean;
  defaultPayerId: string;
  share: number | null;
}) {
  const router = useRouter();
  const applied = Boolean(payerId) && (amount ?? 0) > 0;
  const [amountInput, setAmountInput] = useState(
    applied && amount != null ? String(amount) : "",
  );
  const [selectedPayerId, setSelectedPayerId] = useState(
    payerId ?? defaultPayerId,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setAmountInput(applied && amount != null ? String(amount) : "");
    setSelectedPayerId(payerId ?? defaultPayerId);
    setError(null);
  }, [applied, amount, payerId, defaultPayerId]);

  const options = useMemo(() => {
    const list =
      payerId && payerName && !goingPlayers.some((p) => p.id === payerId)
        ? [...goingPlayers, { id: payerId, displayName: payerName }]
        : goingPlayers;
    return [...list].sort((a, b) =>
      a.displayName.localeCompare(b.displayName, "es"),
    );
  }, [goingPlayers, payerId, payerName]);

  function save(nextAmount: string, nextPayerId: string) {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("playSessionId", playSessionId);
      formData.set("recogeBolasAmount", nextAmount);
      formData.set("recogeBolasPayerId", nextPayerId);
      const result = await applyRecogeBolasAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="animate-rise mt-8">
      <h2 className="text-[1.05rem] font-semibold tracking-[-0.02em] text-ink">
        Recoge bolas
      </h2>
      <p className="mt-1 text-[0.85rem] text-muted">
        En algunas canchas hay que pagar a quien recoge las pelotas. Se
        reparte entre quienes van.
      </p>

      {applied && !canEdit ? (
        <p className="mt-3 rounded-2xl bg-sand px-4 py-3.5 text-[0.95rem] text-ink">
          {formatSoles(amount ?? 0)}
          {payerName ? ` · pagó ${payerName}` : ""}
          {share != null ? (
            <span className="mt-0.5 block text-[0.8rem] text-muted">
              {formatSoles(share)} c/u
            </span>
          ) : null}
        </p>
      ) : null}

      {!applied && !canEdit ? (
        <p className="mt-3 text-[0.85rem] text-muted">
          {goingPlayers.length === 0
            ? "Cuando haya Voy puedes registrar recoge bolas."
            : "Marca Voy para registrar el monto y quién pagó."}
        </p>
      ) : null}

      {canEdit ? (
        <div className="mt-3 space-y-3">
          <label className="block text-[0.8rem] text-muted">
            Costo (S/)
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              disabled={pending}
              placeholder="8"
              className="mt-1 w-full rounded-xl bg-sand px-3 py-3 text-ink placeholder:text-muted"
            />
          </label>
          <label className="block text-[0.8rem] text-muted">
            Quién pagó
            <select
              value={selectedPayerId}
              onChange={(e) => setSelectedPayerId(e.target.value)}
              disabled={pending || options.length === 0}
              className="mt-1 w-full rounded-xl bg-sand px-3 py-3 text-ink"
            >
              {options.length === 0 ? (
                <option value="">No hay Voy</option>
              ) : (
                options.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.displayName}
                    {payerId === player.id &&
                    !goingPlayers.some((p) => p.id === player.id)
                      ? " (ya no está en Voy)"
                      : ""}
                  </option>
                ))
              )}
            </select>
          </label>
          {error ? (
            <p className="text-[0.85rem] text-danger">{error}</p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending || options.length === 0}
              onClick={() => save(amountInput, selectedPayerId)}
              className="flex-1 cursor-pointer rounded-2xl bg-[#A0B05F] py-3 text-[0.95rem] font-semibold text-on-ball disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {pending
                ? "Guardando…"
                : applied
                  ? "Guardar"
                  : "Aplicar"}
            </button>
            {applied && isAppAdmin ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => save("", "")}
                className="rounded-2xl bg-mist-2 px-4 py-3 text-[0.95rem] font-medium text-ink disabled:opacity-70"
              >
                Quitar
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { reassignFinancierAction } from "@/lib/actions/sessions";

type FinancierOption = { id: string; displayName: string };

export function SessionFinancierControl({
  playSessionId,
  financier,
  players,
  canReassign,
}: {
  playSessionId: string;
  financier: FinancierOption;
  players: FinancierOption[];
  canReassign: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [selectedId, setSelectedId] = useState(financier.id);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    setSelectedId(financier.id);
  }, [financier.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const options = useMemo(() => {
    const list = players.some((p) => p.id === financier.id)
      ? players
      : [...players, financier];
    return [...list].sort((a, b) =>
      a.displayName.localeCompare(b.displayName, "es"),
    );
  }, [players, financier]);

  const departed = !players.some((p) => p.id === financier.id);

  function save() {
    if (selectedId === financier.id) {
      setOpen(false);
      return;
    }
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("playSessionId", playSessionId);
      formData.set("financierId", selectedId);
      const result = await reassignFinancierAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  const label = (
    <>
      <span className="truncate text-[0.9rem] font-medium text-ink">
        {financier.displayName}
      </span>
      <span className="shrink-0 rounded-md bg-mist-2 px-1.5 py-0.5 text-[0.65rem] font-medium leading-none text-muted">
        Host
      </span>
    </>
  );

  if (!canReassign) {
    return (
      <p className="inline-flex min-w-0 items-center gap-1.5">{label}</p>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSelectedId(financier.id);
          setError(null);
          setOpen(true);
        }}
        className="inline-flex min-w-0 items-center gap-1.5 text-left transition active:scale-[0.98]"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {label}
        <span className="shrink-0 text-[0.75rem] font-medium text-muted">
          Cambiar
        </span>
      </button>

      {portalReady && open
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 pb-[max(1rem,var(--safe-bottom))]"
              role="presentation"
              onClick={() => !pending && setOpen(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="change-financier-title"
                className="w-full max-w-sm rounded-2xl bg-sand px-5 pb-5 pt-4 shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <h2
                  id="change-financier-title"
                  className="text-[1.15rem] font-semibold tracking-[-0.02em] text-ink"
                >
                  Quién pagó
                </h2>
                <p className="mt-1 text-[0.85rem] text-muted">
                  Las deudas de esta fecha quedan con esa persona.
                </p>
                <label className="mt-4 block text-[0.8rem] text-muted">
                  Financiador
                  <select
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    disabled={pending}
                    className="mt-1 w-full rounded-xl bg-mist-2 px-3 py-3 text-ink"
                  >
                    {options.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.displayName}
                        {departed && player.id === financier.id
                          ? " (ya no está en el grupo)"
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>
                {error ? (
                  <p className="mt-2 text-[0.85rem] text-danger">{error}</p>
                ) : null}
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-2xl bg-mist-2 py-3 text-[0.95rem] font-medium text-ink disabled:opacity-70"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={save}
                    className="flex-1 rounded-2xl bg-ball py-3 text-[0.95rem] font-semibold text-on-ball disabled:opacity-70"
                  >
                    {pending ? "Guardando…" : "Guardar"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

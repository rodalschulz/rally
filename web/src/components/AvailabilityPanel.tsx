"use client";

import type { AvailabilitySlots } from "@/lib/data/availability";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

function formatFetchedAt(iso: string): string {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    dateStyle: "medium",
    timeStyle: "short",
    hourCycle: "h23",
  }).format(new Date(iso));
}

function weekdayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return new Intl.DateTimeFormat("es-PE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

export function AvailabilityPanel({
  slots,
  fetchedAt,
}: {
  slots: AvailabilitySlots | null;
  fetchedAt: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const dates = slots ? Object.keys(slots).sort() : [];
  const hasData = dates.length > 0;

  useEffect(() => {
    setPortalReady(true);
  }, []);

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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center justify-center rounded-full border-0 bg-sand px-3.5 text-[0.8rem] font-medium leading-none tracking-[-0.01em] text-ink ring-1 ring-ink/10"
      >
        Canchas
      </button>

      {portalReady && open
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
              role="presentation"
              onClick={() => setOpen(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="canchas-title"
                className="flex max-h-[min(75vh,32rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-sand shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3 border-b border-ink/6 px-4 py-3">
                  <div className="min-w-0">
                    <h2
                      id="canchas-title"
                      className="text-[1.05rem] font-semibold tracking-[-0.02em] text-ink"
                    >
                      Canchas libres
                    </h2>
                    {fetchedAt ? (
                      <p className="mt-0.5 text-[0.7rem] text-muted">
                        Última actualización: {formatFetchedAt(fetchedAt)}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="shrink-0 rounded-lg px-2 py-1 text-[0.9rem] font-medium text-muted"
                    aria-label="Cerrar"
                  >
                    Cerrar
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  {!hasData ? (
                    <p className="px-4 py-6 text-[0.9rem] text-muted">
                      Todavía no hay horarios disponibles.
                    </p>
                  ) : (
                    <ul className="divide-y divide-ink/6">
                      {dates.map((fecha) => {
                        const times = Object.keys(slots![fecha]).sort();
                        return (
                          <li key={fecha} className="px-4 py-3">
                            <p className="text-[0.9rem] font-medium capitalize text-ink">
                              {weekdayLabel(fecha)}
                            </p>
                            <ul className="mt-2 space-y-1.5">
                              {times.map((t) => {
                                const courts = slots![fecha][t] ?? [];
                                const timeLabel = t.slice(0, 5);
                                return (
                                  <li
                                    key={t}
                                    className="flex items-baseline justify-between gap-3 text-[0.85rem]"
                                  >
                                    <span className="tabular-nums text-ink">
                                      {timeLabel}
                                    </span>
                                    <span className="text-right text-muted">
                                      {courts.length ? courts.join(", ") : "—"}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { formatSoles } from "@/lib/format";
import {
  OVERDUE_DEBT_NUDGE_STORAGE_KEY,
  type OverdueDebtNudge as OverdueDebtNudgeData,
} from "@/lib/debts/overdueNudge";

export function OverdueDebtNudge({ nudge }: { nudge: OverdueDebtNudgeData }) {
  const [portalReady, setPortalReady] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    const dismissed =
      sessionStorage.getItem(OVERDUE_DEBT_NUDGE_STORAGE_KEY) === "1";
    if (!dismissed) setOpen(true);
  }, []);

  const dismiss = useCallback(() => {
    setOpen(false);
    try {
      sessionStorage.setItem(OVERDUE_DEBT_NUDGE_STORAGE_KEY, "1");
    } catch {
      /* private mode */
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, dismiss]);

  if (!portalReady || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 pb-[max(1rem,var(--safe-bottom))]"
      role="presentation"
      onClick={dismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="overdue-debt-title"
        className="relative w-full max-w-sm rounded-2xl bg-sand px-5 pb-5 pt-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-2.5 top-2.5 inline-flex size-8 items-center justify-center rounded-full text-muted transition hover:bg-mist-2 hover:text-ink"
          aria-label="Cerrar"
        >
          <CloseXIcon />
        </button>

        <h2
          id="overdue-debt-title"
          className="pr-8 text-[1.15rem] font-semibold tracking-[-0.02em] text-ink"
        >
          Tienes deudas pendientes
        </h2>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">
          Debes {formatSoles(nudge.totalAmount)} de{" "}
          {nudge.debtCount === 1
            ? "una Fecha"
            : `${nudge.debtCount} Fechas`}{" "}
          de hace más de una semana. Por favor págalas.
        </p>

        <Link
          href={`/grupos/${nudge.groupSlug}/deudas`}
          onClick={dismiss}
          className="mt-5 flex h-11 items-center justify-center rounded-full bg-ball-deep text-[0.95rem] font-semibold text-on-ball"
        >
          Ver deudas
        </Link>
      </div>
    </div>,
    document.body,
  );
}

function CloseXIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

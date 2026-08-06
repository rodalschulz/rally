"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Match } from "@/lib/domain/types";
import { buildSessionEloPaths } from "@/lib/ranking/playerStats";
import { SessionEloPathsChart } from "./SessionEloPathsChart";

export function SessionEloPathsSheet({
  open,
  onClose,
  sessionId,
  historyMatches,
  sessionMatches,
  displayNameById,
}: {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  historyMatches: Match[];
  sessionMatches: Match[];
  displayNameById: Record<string, string>;
}) {
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const nameMap = useMemo(
    () => new Map(Object.entries(displayNameById)),
    [displayNameById],
  );

  const series = useMemo(() => {
    if (!open) return [];
    return buildSessionEloPaths({
      sessionId,
      historyMatches,
      displayNameById: nameMap,
      sessionMatchesOverride: sessionMatches,
    });
  }, [open, sessionId, historyMatches, sessionMatches, nameMap]);

  if (!portalReady || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-3 pb-[max(0.75rem,var(--safe-bottom))] sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="elo-paths-title"
        className="flex max-h-[min(88dvh,40rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-sand shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink/6 px-4 py-3">
          <div className="min-w-0">
            <h3
              id="elo-paths-title"
              className="text-[1.05rem] font-semibold tracking-[-0.02em] text-ink"
            >
              Elo
            </h3>
            <p className="mt-0.5 text-[0.8rem] text-muted">
              Trayectoria Elo.G de cada jugador en esta Fecha.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg px-2 py-1 text-[0.9rem] font-medium text-muted"
            aria-label="Cerrar"
          >
            Cerrar
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <SessionEloPathsChart series={series} />
        </div>
      </div>
    </div>,
    document.body,
  );
}

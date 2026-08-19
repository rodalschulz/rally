"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { loadAllSettledDebtsAction } from "@/lib/actions/lists";
import type { DebtWithSession, Player } from "@/lib/domain/types";
import { settleActorLabel } from "@/lib/debts/settleLabel";
import { formatSessionChip, formatSessionWhen, formatSoles } from "@/lib/format";
import { Spinner } from "./Spinner";

export function SettledDebtsHistory({
  slug,
  preview,
  hasMore,
  players,
}: {
  slug: string;
  preview: DebtWithSession[];
  hasMore: boolean;
  players: Player[];
}) {
  const [items, setItems] = useState(preview);
  const [expanded, setExpanded] = useState(!hasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playersById = useMemo(
    () => new Map(players.map((p) => [p.id, p])),
    [players],
  );
  const displayNameById = useMemo(
    () => new Map(players.map((p) => [p.id, p.displayName] as const)),
    [players],
  );

  async function loadAll() {
    if (loading || expanded) return;
    setLoading(true);
    setError(null);
    try {
      const all = await loadAllSettledDebtsAction(slug);
      setItems(all);
      setExpanded(true);
    } catch {
      setError("No se pudo cargar el historial. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-8 mb-4">
      <h2 className="mb-2 text-[1.05rem] font-semibold tracking-[-0.02em] text-ink">
        Historial
      </h2>
      {items.length === 0 ? (
        <p className="text-[0.95rem] text-muted">
          Todavía no hay deudas saldadas.
        </p>
      ) : (
        <>
          <ul className="overflow-hidden rounded-2xl bg-sand">
            {items.map((d) => {
              const from = playersById.get(d.fromPlayerId);
              const to = playersById.get(d.toPlayerId);
              const when = formatSessionWhen(d.sessionStartsAt);
              const fechaLabel = `${formatSessionChip(d.sessionStartsAt)} · ${when.time}`;
              const settledWhen = d.settledAt
                ? formatSessionWhen(d.settledAt)
                : null;
              const settledByLabel = settleActorLabel(d, displayNameById);
              return (
                <li
                  key={d.id}
                  className="border-b border-ink/6 px-4 py-3 text-[0.9rem] last:border-b-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p>
                        <span className="font-medium text-ink">
                          {from?.displayName}
                        </span>
                        <span className="text-muted"> → {to?.displayName}</span>
                      </p>
                      <Link
                        href={`/grupos/${slug}/sessions/${d.sessionId}`}
                        className="mt-0.5 block truncate text-[0.8rem] text-muted hover:text-ink"
                      >
                        {fechaLabel}
                        {d.sessionCourtLabel ? ` · ${d.sessionCourtLabel}` : ""}
                      </Link>
                      <p className="mt-0.5 text-[0.75rem] text-muted">
                        {settledByLabel
                          ? settledWhen
                            ? `${settledByLabel} · ${settledWhen.dayMonth} · ${settledWhen.time}`
                            : settledByLabel
                          : settledWhen
                            ? `Saldada ${settledWhen.dayMonth} · ${settledWhen.time}`
                            : "Saldada"}
                      </p>
                    </div>
                    <span className="shrink-0 font-medium tabular-nums text-muted">
                      {formatSoles(d.amount)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
          {!expanded ? (
            <div className="mt-2">
              <button
                type="button"
                onClick={loadAll}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sand py-3 text-[0.85rem] font-medium text-ink ring-1 ring-ink/8 transition hover:bg-mist-2/40 active:opacity-80 disabled:opacity-70"
              >
                {loading ? <Spinner className="text-muted" /> : null}
                {loading ? "Cargando…" : "Ver todo el historial"}
              </button>
              {error ? (
                <p className="mt-2 text-center text-[0.8rem] text-danger">
                  {error}
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

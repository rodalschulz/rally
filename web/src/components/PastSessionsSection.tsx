"use client";

import { useState } from "react";
import { loadAllPastSessionsAction } from "@/lib/actions/lists";
import type { HubSessionItem } from "@/lib/sessions/hub";
import { Spinner } from "./Spinner";
import { SessionRow } from "./SessionRow";

export function PastSessionsSection({
  slug,
  preview,
  hasMore,
}: {
  slug: string;
  preview: HubSessionItem[];
  hasMore: boolean;
}) {
  const [items, setItems] = useState(preview);
  const [expanded, setExpanded] = useState(!hasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    if (loading || expanded) return;
    setLoading(true);
    setError(null);
    try {
      const all = await loadAllPastSessionsAction(slug);
      setItems(all);
      setExpanded(true);
    } catch {
      setError("No se pudieron cargar las fechas. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-8" aria-labelledby="past-heading">
      <h2
        id="past-heading"
        className="mb-2 text-[1.05rem] font-semibold tracking-[-0.02em] text-ink"
      >
        Fechas Pasadas
      </h2>
      <div className="overflow-hidden rounded-2xl bg-sand">
        {items.map((item, i) => (
          <SessionRow
            key={item.session.id}
            session={item.session}
            goingPlayers={item.goingPlayers}
            goingCount={item.goingCount}
            index={i}
            hrefBase={`/grupos/${slug}/sessions`}
          />
        ))}
      </div>
      {!expanded ? (
        <div className="mt-2">
          <button
            type="button"
            onClick={loadAll}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sand py-3 text-[0.85rem] font-medium text-ink ring-1 ring-ink/8 transition hover:bg-mist-2/40 active:opacity-80 disabled:opacity-70"
          >
            {loading ? <Spinner className="text-muted" /> : null}
            {loading ? "Cargando…" : "Ver todas"}
          </button>
          {error ? (
            <p className="mt-2 text-center text-[0.8rem] text-danger">{error}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

import type { AvailabilitySlots } from "@/lib/data/availability";

function formatFetchedAt(iso: Date): string {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(iso);
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
  fetchedAt: Date | null;
}) {
  const dates = slots ? Object.keys(slots).sort() : [];
  const hasData = dates.length > 0;

  return (
    <section className="mb-8" aria-labelledby="availability-heading">
      <div className="mb-2 flex items-end justify-between gap-3">
        <h2
          id="availability-heading"
          className="text-[1.05rem] font-semibold tracking-[-0.02em] text-ink"
        >
          Canchas libres
        </h2>
        {fetchedAt ? (
          <p className="text-[0.7rem] text-muted">
            {formatFetchedAt(fetchedAt)}
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl bg-sand">
        {!hasData ? (
          <p className="px-4 py-5 text-[0.9rem] text-muted">
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
                          <span className="tabular-nums text-ink">{timeLabel}</span>
                          <span className="text-right text-muted">
                            {courts.length
                              ? courts.join(", ")
                              : "—"}
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
    </section>
  );
}

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AvailabilityPanel } from "@/components/AvailabilityPanel";
import { InstallBanner } from "@/components/InstallBanner";
import { SessionRow, goingFrom } from "@/components/SessionRow";
import {
  getLatestAvailability,
  type AvailabilitySlots,
} from "@/lib/data/availability";
import {
  listAttendancesForSessions,
  listPlaySessions,
  listPlayers,
  toSession,
} from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [rows, players, availability] = await Promise.all([
    listPlaySessions(),
    listPlayers(),
    getLatestAvailability(),
  ]);
  const sessions = rows.map(toSession);
  const attendances = await listAttendancesForSessions(
    sessions.map((s) => s.id),
  );

  const upcoming = sessions
    .filter((s) => s.status === "scheduled")
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const past = sessions
    .filter((s) => s.status === "completed")
    .sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt));

  return (
    <AppShell>
      <section className="animate-rise mb-8 pt-1">
        <h1 className="whitespace-nowrap text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-ink">
          ¿Quién juega la próxima?
        </h1>
      </section>

      <InstallBanner />

      <section aria-labelledby="upcoming-heading">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2
            id="upcoming-heading"
            className="text-[1.05rem] font-semibold tracking-[-0.02em] text-ink"
          >
            Próximas
          </h2>
          <Link
            href="/sessions/nueva"
            className="rounded-full bg-sand px-3.5 py-1.5 text-[0.8rem] font-medium text-ink ring-1 ring-ink/10"
          >
            Nueva
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl bg-sand">
          {upcoming.length === 0 ? (
            <p className="px-4 py-8 text-center text-[0.9rem] text-muted">
              No hay fechas todavía. Crea la primera.
            </p>
          ) : (
            upcoming.map((session, i) => {
              const g = goingFrom(session.id, attendances, players);
              return (
                <SessionRow
                  key={session.id}
                  session={session}
                  goingPlayers={g.players}
                  goingCount={g.count}
                  index={i}
                />
              );
            })
          )}
        </div>
      </section>

      <AvailabilityPanel
        slots={(availability?.slots as AvailabilitySlots | null) ?? null}
        fetchedAt={availability?.fetchedAt?.toISOString() ?? null}
      />

      {past.length > 0 ? (
        <section className="mt-8" aria-labelledby="past-heading">
          <h2
            id="past-heading"
            className="mb-2 text-[1.05rem] font-semibold tracking-[-0.02em] text-ink"
          >
            Anteriores
          </h2>
          <div className="overflow-hidden rounded-2xl bg-sand">
            {past.map((session, i) => {
              const g = goingFrom(session.id, attendances, players);
              return (
                <SessionRow
                  key={session.id}
                  session={session}
                  goingPlayers={g.players}
                  goingCount={g.count}
                  index={i}
                />
              );
            })}
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}

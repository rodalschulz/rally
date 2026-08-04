import { Suspense } from "react";
import Link from "next/link";
import { AvailabilitySection } from "@/components/AvailabilitySection";
import { InviteLinkCard } from "@/components/InviteLinkCard";
import { MembersPanel } from "@/components/MembersPanel";
import { SessionRow, goingFrom } from "@/components/SessionRow";
import {
  listGroupMembers,
  listPlaySessions,
  toAttendance,
  toSession,
} from "@/lib/data/queries";
import { requireGroupMember } from "@/lib/groups";
import { isSessionPast } from "@/lib/sessions/windows";

export const dynamic = "force-dynamic";

export default async function GroupHubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const group = await requireGroupMember(slug);

  const [rows, members] = await Promise.all([
    listPlaySessions(group.id),
    listGroupMembers(group.id),
  ]);
  const players = members.map((m) => m.player);
  const sessions = rows
    .map(toSession)
    .filter((s) => s.status !== "cancelled");
  const attendances = rows.flatMap((r) => r.attendances.map(toAttendance));

  const upcoming = sessions
    .filter((s) => !isSessionPast(s.startsAt))
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const past = sessions
    .filter((s) => isSessionPast(s.startsAt))
    .sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt));

  const isOwner = group.membership.role === "owner";

  return (
    <>
      <section className="animate-rise mb-8 pt-1">
        <div className="flex items-center gap-1.5">
          <h1 className="m-0 min-w-0 truncate text-[1.75rem] font-semibold leading-none tracking-[-0.03em] text-ink">
            {group.name}
          </h1>
          <div className="ml-1.5 flex h-[1.75rem] shrink-0 items-center gap-1">
            <MembersPanel members={members} />
            {isOwner ? (
              <InviteLinkCard inviteCode={group.inviteCode} isOwner />
            ) : null}
          </div>
        </div>
        {group.description ? (
          <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">
            {group.description}
          </p>
        ) : null}
      </section>

      <section aria-labelledby="upcoming-heading">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <h2
              id="upcoming-heading"
              className="text-[1.05rem] font-semibold tracking-[-0.02em] text-ink"
            >
              Próximas Fechas
            </h2>
            <details className="relative">
              <summary
                className="flex size-6 cursor-pointer list-none items-center justify-center rounded-full text-muted transition hover:bg-mist-2 hover:text-ink [&::-webkit-details-marker]:hidden"
                aria-label="Duración de una fecha"
              >
                <InfoIcon />
              </summary>
              <p className="absolute left-0 top-full z-10 mt-1.5 w-[15.5rem] rounded-xl bg-sand px-3 py-2.5 text-[0.8rem] leading-snug text-muted shadow-sm ring-1 ring-ink/8">
                Cada fecha dura{" "}
                <span className="font-medium text-ink">1 hora</span>. Si
                reservaste más, crea una por cada hora.
              </p>
            </details>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Suspense
              fallback={
                <span
                  className="inline-block h-8 w-[4.5rem] animate-pulse rounded-full bg-sand ring-1 ring-ink/10"
                  aria-hidden
                />
              }
            >
              <AvailabilitySection />
            </Suspense>
            <Link
              href={`/grupos/${slug}/sessions/nueva`}
              className="inline-flex h-8 items-center justify-center rounded-full bg-sand px-3.5 text-[0.8rem] font-medium leading-none tracking-[-0.01em] text-ink ring-1 ring-ink/10"
            >
              Nueva
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-sand">
          {upcoming.length === 0 ? (
            <p className="px-4 py-8 text-center text-[0.9rem] text-muted">
              {past.length > 0
                ? "No hay próximas fechas."
                : "No hay fechas todavía. Crea la primera."}
            </p>
          ) : (
            upcoming.map((session, i) => {
              const g = goingFrom(
                session.id,
                attendances,
                players,
                session.createdById,
              );
              return (
                <SessionRow
                  key={session.id}
                  session={session}
                  goingPlayers={g.players}
                  goingCount={g.count}
                  index={i}
                  hrefBase={`/grupos/${slug}/sessions`}
                />
              );
            })
          )}
        </div>
      </section>

      {past.length > 0 ? (
        <section className="mt-8" aria-labelledby="past-heading">
          <h2
            id="past-heading"
            className="mb-2 text-[1.05rem] font-semibold tracking-[-0.02em] text-ink"
          >
            Fechas Pasadas
          </h2>
          <div className="overflow-hidden rounded-2xl bg-sand">
            {past.map((session, i) => {
              const g = goingFrom(
                session.id,
                attendances,
                players,
                session.createdById,
              );
              return (
                <SessionRow
                  key={session.id}
                  session={session}
                  goingPlayers={g.players}
                  goingCount={g.count}
                  index={i}
                  hrefBase={`/grupos/${slug}/sessions`}
                />
              );
            })}
          </div>
        </section>
      ) : null}
    </>
  );
}

function InfoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 10.5v6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="12" cy="7.25" r="1" fill="currentColor" />
    </svg>
  );
}

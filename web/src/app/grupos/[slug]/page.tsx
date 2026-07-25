import { Suspense } from "react";
import Link from "next/link";
import { AvailabilitySection } from "@/components/AvailabilitySection";
import { AvailabilitySkeleton } from "@/components/GroupSkeletons";
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
  const sessions = rows.map(toSession);
  const attendances = rows.flatMap((r) => r.attendances.map(toAttendance));

  const upcoming = sessions
    .filter((s) => s.status === "scheduled")
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const past = sessions
    .filter((s) => s.status === "completed")
    .sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt));

  const isOwner = group.membership.role === "owner";

  return (
    <>
      <section className="animate-rise mb-8 pt-1">
        <div className="flex items-center gap-1">
          <h1 className="m-0 min-w-0 text-[1.75rem] font-semibold leading-none tracking-[-0.03em] text-ink">
            {group.name}
          </h1>
          {isOwner ? (
            <InviteLinkCard inviteCode={group.inviteCode} isOwner />
          ) : null}
        </div>
      </section>

      <section aria-labelledby="upcoming-heading">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2
            id="upcoming-heading"
            className="text-[1.05rem] font-semibold tracking-[-0.02em] text-ink"
          >
            Próximas Fechas
          </h2>
          <Link
            href={`/grupos/${slug}/sessions/nueva`}
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
                  hrefBase={`/grupos/${slug}/sessions`}
                />
              );
            })
          )}
        </div>
      </section>

      <Suspense fallback={<AvailabilitySkeleton />}>
        <AvailabilitySection />
      </Suspense>

      <MembersPanel members={members} />

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

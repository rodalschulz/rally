import { redirect } from "next/navigation";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { SessionLimitsFields } from "@/components/SessionLimitsFields";
import { updatePlaySessionAction } from "@/lib/actions/sessions";
import { getPlaySession, listGroupPlayers, toSession } from "@/lib/data/queries";
import { toDatetimeLocalValue } from "@/lib/format";
import { requireGroupMember } from "@/lib/groups";

export const dynamic = "force-dynamic";

export default async function EditSessionPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const group = await requireGroupMember(slug);
  const [row, players] = await Promise.all([
    getPlaySession(id, group.id),
    listGroupPlayers(group.id),
  ]);
  if (!row) redirect("/");

  if (group.membership.userId !== row.createdById) {
    redirect(`/grupos/${slug}/sessions/${id}`);
  }

  const session = toSession(row);

  return (
    <>
      <section className="animate-rise mb-6">
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-ink">
          Editar fecha
        </h1>
        <p className="mt-1 text-[0.95rem] text-muted">
          Hora, cancha, costo, cupo e invitados. Las deudas se recalculan.
        </p>
      </section>

      <form action={updatePlaySessionAction} className="animate-rise space-y-4">
        <input type="hidden" name="playSessionId" value={session.id} />
        <label className="block text-[0.8rem] text-muted">
          Fecha y hora
          <input
            type="datetime-local"
            name="startsAt"
            required
            defaultValue={toDatetimeLocalValue(session.startsAt)}
            className="mt-1 w-full rounded-xl bg-sand px-3 py-3 text-ink"
          />
        </label>
        <label className="block text-[0.8rem] text-muted">
          Cancha (opcional)
          <input
            name="courtLabel"
            defaultValue={session.courtLabel ?? ""}
            placeholder="Cancha 32"
            className="mt-1 w-full rounded-xl bg-sand px-3 py-3 text-ink placeholder:text-muted"
          />
        </label>
        <label className="block text-[0.8rem] text-muted">
          Costo total (S/)
          <input
            type="number"
            name="costAmount"
            min="0"
            step="0.5"
            defaultValue={session.costAmount}
            required
            className="mt-1 w-full rounded-xl bg-sand px-3 py-3 text-ink"
          />
        </label>
        <label className="block text-[0.8rem] text-muted">
          Nota (opcional)
          <input
            name="note"
            defaultValue={session.note ?? ""}
            placeholder="Traer pelotas"
            className="mt-1 w-full rounded-xl bg-sand px-3 py-3 text-ink placeholder:text-muted"
          />
        </label>

        <SessionLimitsFields
          players={players}
          creatorId={session.createdById}
          defaultMaxAttendees={session.maxAttendees}
          defaultAllowedUserIds={session.allowedUserIds}
        />

        <PendingSubmitButton
          pendingLabel="Guardando…"
          className="w-full rounded-2xl bg-ball py-3.5 text-[1rem] font-semibold text-on-ball"
        >
          Guardar cambios
        </PendingSubmitButton>
      </form>
    </>
  );
}

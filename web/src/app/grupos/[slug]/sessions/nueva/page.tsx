import { FinancierCoversField } from "@/components/FinancierCoversField";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { SessionLimitsFields } from "@/components/SessionLimitsFields";
import { createPlaySessionAction } from "@/lib/actions/sessions";
import { listGroupPlayers } from "@/lib/data/queries";
import { defaultSessionDatetimeLocal } from "@/lib/format";
import { requireGroupMember } from "@/lib/groups";

export const dynamic = "force-dynamic";

export default async function NewSessionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const group = await requireGroupMember(slug);
  const players = await listGroupPlayers(group.id);

  return (
    <>
      <section className="animate-rise mb-6">
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-ink">
          Nueva fecha
        </h1>
        <p className="mt-1 text-[0.95rem] text-muted">
          Quedas como financiador y con asistencia “Voy”. Cada fecha dura{" "}
          <span className="font-medium text-ink">1 hora</span>. Si reservaste
          más, crea una fecha por cada hora (con el costo de esa hora).
        </p>
      </section>

      <form
        action={createPlaySessionAction}
        className="animate-rise min-w-0 space-y-4"
      >
        <input type="hidden" name="groupId" value={group.id} />
        <label className="block min-w-0 text-[0.8rem] text-muted">
          Fecha y hora
          <input
            type="datetime-local"
            name="startsAt"
            required
            step={3600}
            defaultValue={defaultSessionDatetimeLocal()}
            className="mt-1 w-full min-w-0 max-w-full rounded-xl bg-sand px-3 py-3 text-ink"
          />
        </label>
        <label className="block text-[0.8rem] text-muted">
          Cancha (opcional)
          <input
            name="courtLabel"
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
            defaultValue="22.5"
            required
            className="mt-1 w-full rounded-xl bg-sand px-3 py-3 text-ink"
          />
        </label>

        <FinancierCoversField />

        <label className="block text-[0.8rem] text-muted">
          Nota (opcional)
          <input
            name="note"
            placeholder="Traer pelotas"
            className="mt-1 w-full rounded-xl bg-sand px-3 py-3 text-ink placeholder:text-muted"
          />
        </label>

        <SessionLimitsFields
          players={players}
          creatorId={group.membership.userId}
        />

        <PendingSubmitButton
          pendingLabel="Creando…"
          className="w-full rounded-2xl bg-ball py-3.5 text-[1rem] font-semibold text-on-ball"
        >
          Crear fecha
        </PendingSubmitButton>
      </form>
    </>
  );
}

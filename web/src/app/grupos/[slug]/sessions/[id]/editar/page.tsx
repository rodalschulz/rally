import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { updatePlaySessionAction } from "@/lib/actions/sessions";
import { getPlaySession, toSession } from "@/lib/data/queries";
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
  const row = await getPlaySession(id, group.id);
  if (!row) notFound();

  if (group.membership.userId !== row.createdById) {
    redirect(`/grupos/${slug}/sessions/${id}`);
  }

  const session = toSession(row);

  return (
    <>
      <Link
        href={`/grupos/${slug}/sessions/${id}`}
        className="mb-5 inline-flex text-[0.9rem] font-medium text-muted"
      >
        ← Detalle
      </Link>

      <section className="animate-rise mb-6">
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-ink">
          Editar fecha
        </h1>
        <p className="mt-1 text-[0.95rem] text-muted">
          Cambiar hora, cancha, costo o nota. Las deudas se recalculan.
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

import Link from "next/link";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { createPlaySessionAction } from "@/lib/actions/sessions";
import { requireGroupMember } from "@/lib/groups";

export const dynamic = "force-dynamic";

export default async function NewSessionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const group = await requireGroupMember(slug);

  return (
    <>
      <Link
        href={`/grupos/${slug}`}
        className="mb-5 inline-flex text-[0.9rem] font-medium text-muted"
      >
        ← Fechas
      </Link>

      <section className="animate-rise mb-6">
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-ink">
          Nueva fecha
        </h1>
        <p className="mt-1 text-[0.95rem] text-muted">
          Quedas como financiador y con asistencia “Voy”.
        </p>
      </section>

      <form action={createPlaySessionAction} className="animate-rise space-y-4">
        <input type="hidden" name="groupId" value={group.id} />
        <label className="block text-[0.8rem] text-muted">
          Fecha y hora
          <input
            type="datetime-local"
            name="startsAt"
            required
            className="mt-1 w-full rounded-xl bg-sand px-3 py-3 text-ink"
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
        <label className="block text-[0.8rem] text-muted">
          Nota (opcional)
          <input
            name="note"
            placeholder="Traer pelotas"
            className="mt-1 w-full rounded-xl bg-sand px-3 py-3 text-ink placeholder:text-muted"
          />
        </label>
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

import Link from "next/link";
import { auth } from "@/auth";
import { AppShell } from "@/components/AppShell";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { joinPublicGroupAction } from "@/lib/actions/groups";
import { listMyGroups, listPublicGroups } from "@/lib/groups";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  const { error } = await searchParams;
  const [publicGroups, mine] = await Promise.all([
    listPublicGroups(),
    userId ? listMyGroups(userId) : Promise.resolve([]),
  ]);
  const myGroupIds = new Set(mine.map((m) => m.groupId));

  return (
    <AppShell>
      <section className="animate-rise mb-8 pt-2">
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-ink">
          Coordina tenis con tu grupo
        </h1>
        <p className="mt-2 max-w-[34ch] text-[0.95rem] leading-relaxed text-muted">
          Fechas, quién paga la cancha, deudas y rankings — en un espacio para ti
          y tus amigos.
        </p>
        {error ? (
          <p className="mt-3 text-[0.9rem] text-danger">{error}</p>
        ) : null}
      </section>

      <section className="mb-6">
        <Link
          href="/grupos/nuevo"
          className="flex w-full items-center justify-center rounded-2xl bg-ball py-3.5 text-[1rem] font-semibold text-on-ball"
        >
          Crear grupo
        </Link>
      </section>

      {mine.length > 0 ? (
        <section className="mb-8" aria-labelledby="mine-heading">
          <h2
            id="mine-heading"
            className="mb-2 text-[1.05rem] font-semibold tracking-[-0.02em] text-ink"
          >
            Mis grupos
          </h2>
          <ul className="overflow-hidden rounded-2xl bg-sand">
            {mine.map(({ group }) => (
              <li key={group.id} className="border-b border-ink/6 last:border-b-0">
                <Link
                  href={`/grupos/${group.slug}`}
                  className="flex items-center justify-between gap-3 px-4 py-3.5 active:bg-mist"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{group.name}</p>
                    <p className="text-[0.8rem] text-muted">
                      {group._count.members}/{group.maxMembers} miembros
                      {group.visibility === "private" ? " · privado" : ""}
                    </p>
                  </div>
                  <span className="text-muted" aria-hidden>
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="public-heading">
        <h2
          id="public-heading"
          className="mb-2 text-[1.05rem] font-semibold tracking-[-0.02em] text-ink"
        >
          Grupos públicos
        </h2>
        <ul className="overflow-hidden rounded-2xl bg-sand">
          {publicGroups.length === 0 ? (
            <li className="px-4 py-8 text-center text-[0.9rem] text-muted">
              No hay grupos públicos todavía. Crea el primero.
            </li>
          ) : (
            publicGroups.map((group) => {
              const isMember = myGroupIds.has(group.id);
              const full = group._count.members >= group.maxMembers;
              return (
                <li
                  key={group.id}
                  className="flex items-center justify-between gap-3 border-b border-ink/6 px-4 py-3.5 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{group.name}</p>
                    <p className="text-[0.8rem] text-muted">
                      {group._count.members}/{group.maxMembers} miembros
                      {full ? " · lleno" : ""}
                    </p>
                  </div>
                  {isMember ? (
                    <Link
                      href={`/grupos/${group.slug}`}
                      className="shrink-0 text-[0.85rem] font-medium text-ink"
                    >
                      Entrar
                    </Link>
                  ) : full ? (
                    <span className="shrink-0 text-[0.85rem] text-muted">
                      Lleno
                    </span>
                  ) : (
                    <form action={joinPublicGroupAction}>
                      <input type="hidden" name="groupId" value={group.id} />
                      <PendingSubmitButton
                        pendingLabel="…"
                        className="shrink-0 text-[0.85rem] font-medium text-ink"
                      >
                        Unirme
                      </PendingSubmitButton>
                    </form>
                  )}
                </li>
              );
            })
          )}
        </ul>
      </section>
    </AppShell>
  );
}

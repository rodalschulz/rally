import Link from "next/link";
import { auth } from "@/auth";
import { AppShell } from "@/components/AppShell";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { joinViaInviteAction } from "@/lib/actions/groups";
import { prisma } from "@/lib/db";
import { getGroupByInviteCode, getMembership } from "@/lib/groups";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { code } = await params;
  const { error } = await searchParams;
  const session = await auth();
  const group = await getGroupByInviteCode(code);

  if (!group) {
    return (
      <AppShell>
        <p className="text-[0.95rem] text-muted">Invitación no válida.</p>
        <Link href="/" className="mt-4 inline-block text-ink underline">
          Volver
        </Link>
      </AppShell>
    );
  }

  if (session?.user?.id) {
    const membership = await getMembership(group.id, session.user.id);
    if (membership) redirect(`/grupos/${group.slug}`);
  }

  const memberCount = await prisma.groupMember.count({
    where: { groupId: group.id },
  });
  const full = memberCount >= group.maxMembers;
  const isPrivate = group.visibility === "private";

  return (
    <AppShell>
      <section className="animate-rise mb-6">
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-ink">
          Unirse a {group.name}
        </h1>
        <p className="mt-1 text-[0.95rem] text-muted">
          {full
            ? `El grupo está lleno (${memberCount}/${group.maxMembers}).`
            : isPrivate
              ? "Este grupo es privado. Ingresa la contraseña."
              : "Confirma para unirte al grupo."}
        </p>
        {error ? (
          <p className="mt-3 text-[0.9rem] text-danger">{error}</p>
        ) : null}
      </section>

      {full ? (
        <Link
          href="/"
          className="flex w-full items-center justify-center rounded-2xl bg-sand py-3.5 text-[1rem] font-semibold text-ink"
        >
          Volver
        </Link>
      ) : !session?.user ? (
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(`/join/${code}`)}`}
          className="flex w-full items-center justify-center rounded-2xl bg-ball py-3.5 text-[1rem] font-semibold text-on-ball"
        >
          Entrar con Google para unirte
        </Link>
      ) : (
        <form action={joinViaInviteAction} className="space-y-4">
          <input type="hidden" name="inviteCode" value={code} />
          {isPrivate ? (
            <label className="block text-[0.8rem] text-muted">
              Contraseña
              <input
                type="password"
                name="password"
                required
                className="mt-1 w-full rounded-xl bg-sand px-3 py-3 text-ink"
              />
            </label>
          ) : null}
          <PendingSubmitButton
            pendingLabel="Uniéndote…"
            className="w-full rounded-2xl bg-ball py-3.5 text-[1rem] font-semibold text-on-ball"
          >
            Unirme
          </PendingSubmitButton>
        </form>
      )}
    </AppShell>
  );
}

import Link from "next/link";
import { EditGroupForm } from "@/components/EditGroupForm";
import { InviteLinkCard } from "@/components/InviteLinkCard";
import { prisma } from "@/lib/db";
import { requireGroupOwner } from "@/lib/groups";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ajustes del grupo" };

export default async function GroupSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const group = await requireGroupOwner(slug);
  const memberCount = await prisma.groupMember.count({
    where: { groupId: group.id },
  });

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
          Ajustes
        </h1>
        <p className="mt-1 text-[0.95rem] text-muted">
          Nombre, cupo y link de invitación.
        </p>
      </section>

      <InviteLinkCard inviteCode={group.inviteCode} isOwner />

      <EditGroupForm
        groupId={group.id}
        slug={slug}
        name={group.name}
        maxMembers={group.maxMembers}
        memberCount={memberCount}
      />
    </>
  );
}

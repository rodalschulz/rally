import { EditGroupForm } from "@/components/EditGroupForm";
import { InviteLinkCard } from "@/components/InviteLinkCard";
import { prisma } from "@/lib/db";
import { requireGroupMember } from "@/lib/groups";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ajustes del grupo" };

export default async function GroupSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const group = await requireGroupMember(slug);
  const isOwner = group.membership.role === "owner";
  const memberCount = await prisma.groupMember.count({
    where: { groupId: group.id },
  });

  return (
    <>
      <section className="animate-rise mb-6">
        <div className="flex items-center gap-1">
          <h1 className="m-0 min-w-0 text-[1.75rem] font-semibold leading-none tracking-[-0.03em] text-ink">
            Ajustes
          </h1>
          {isOwner ? (
            <InviteLinkCard inviteCode={group.inviteCode} isOwner />
          ) : null}
        </div>
        <p className="mt-1 text-[0.95rem] text-muted">
          {isOwner
            ? "Nombre, cupo e invitación del grupo."
            : "Información del grupo."}
        </p>
      </section>

      {isOwner ? (
        <EditGroupForm
          groupId={group.id}
          slug={slug}
          name={group.name}
          maxMembers={group.maxMembers}
          memberCount={memberCount}
        />
      ) : (
        <div className="animate-rise rounded-2xl bg-sand px-4 py-4">
          <p className="text-[0.8rem] text-muted">Grupo</p>
          <p className="mt-1 text-[1.05rem] font-medium text-ink">{group.name}</p>
          <p className="mt-2 text-[0.85rem] text-muted">
            {memberCount}/{group.maxMembers} miembros
            {group.visibility === "private" ? " · privado" : " · público"}
          </p>
          <p className="mt-3 text-[0.85rem] text-muted">
            Solo el dueño puede editar el grupo.
          </p>
        </div>
      )}
    </>
  );
}

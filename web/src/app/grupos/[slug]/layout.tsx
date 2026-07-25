import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { GroupRouteSkeleton } from "@/components/GroupSkeletons";
import { requireGroupMember } from "@/lib/groups";

export default function GroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<GroupRouteSkeleton />}>
      <GroupShell params={params}>{children}</GroupShell>
    </Suspense>
  );
}

async function GroupShell({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const group = await requireGroupMember(slug);

  return (
    <AppShell
      groupSlug={slug}
      isGroupOwner={group.membership.role === "owner"}
    >
      {children}
    </AppShell>
  );
}

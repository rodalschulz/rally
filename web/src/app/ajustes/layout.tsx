import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { GroupRouteSkeleton } from "@/components/GroupSkeletons";

export default function UserSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<GroupRouteSkeleton />}>
      <AppShell title="Ajustes de Usuario">{children}</AppShell>
    </Suspense>
  );
}

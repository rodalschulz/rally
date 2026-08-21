import { UserSettingsScreen } from "@/components/UserSettingsScreen";
import { requireGroupMember } from "@/lib/groups";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ajustes de Usuario" };

export default async function GroupUserSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireGroupMember(slug);
  return <UserSettingsScreen />;
}

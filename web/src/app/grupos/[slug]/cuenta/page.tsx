import {
  loadUserSettingsProfile,
  UserSettingsScreen,
} from "@/components/UserSettingsScreen";
import { getSession } from "@/lib/auth-session";
import { requireGroupMember } from "@/lib/groups";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ajustes de Usuario" };

export default async function GroupUserSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  await Promise.all([
    requireGroupMember(slug),
    loadUserSettingsProfile(session.user.id),
  ]);
  return <UserSettingsScreen />;
}

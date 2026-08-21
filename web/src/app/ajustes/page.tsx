import { UserSettingsScreen } from "@/components/UserSettingsScreen";
import {
  HOME_GROUP_COOKIE,
  parseHomeGroupSlug,
} from "@/lib/pwa/home-group";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ajustes de Usuario" };

export default async function UserSettingsPage() {
  // Stay inside the group layout when possible — client navigations that
  // unmount /grupos/[slug]/layout fail on iOS PWA ("This page couldn't load").
  const slug = parseHomeGroupSlug(
    (await cookies()).get(HOME_GROUP_COOKIE)?.value,
  );
  if (slug) redirect(`/grupos/${slug}/cuenta`);

  return <UserSettingsScreen />;
}

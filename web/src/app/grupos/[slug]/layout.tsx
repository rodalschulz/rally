import { AppShell } from "@/components/AppShell";

export default async function GroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // Membership is checked on each page, in parallel with that page's queries.
  // Keeping the shell free of Neon lets tab changes paint their loading state
  // without waiting on the group row first.
  return <AppShell groupSlug={slug}>{children}</AppShell>;
}

import { signOut } from "@/auth";
import { getSession } from "@/lib/auth-session";
import { loadOverdueDebtNudge } from "@/lib/debts/loadOverdueNudge";
import { BrandMark } from "./BrandMark";
import { BottomNav } from "./BottomNav";
import { HelpButton } from "./HelpButton";
import { OverdueDebtNudge } from "./OverdueDebtNudge";
import { ServiceWorkerRegister } from "./ServiceWorkerRegister";
import { UserMenu } from "./UserMenu";

export async function AppShell({
  children,
  title,
  subtitle,
  /** When set, shows group coordination bottom nav */
  groupSlug,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  groupSlug?: string;
}) {
  const session = await getSession();
  const inGroup = Boolean(groupSlug);
  const showNav = Boolean(session?.user);
  const userId = session?.user?.id;
  const overdueNudge = userId ? await loadOverdueDebtNudge(userId) : null;

  return (
    <div className="app-shell">
      <ServiceWorkerRegister />
      {overdueNudge ? <OverdueDebtNudge nudge={overdueNudge} /> : null}
      <header className="app-header sticky top-0 z-30 border-b border-ink/6 bg-mist/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-5 py-3">
          <BrandMark compact />
          <div className="flex min-w-0 items-center gap-3">
            {title ? (
              <div className="min-w-0 text-right">
                <p className="truncate text-[0.95rem] font-medium text-ink">
                  {title}
                </p>
                {subtitle ? (
                  <p className="truncate text-[0.8rem] text-muted">{subtitle}</p>
                ) : null}
              </div>
            ) : session?.user && !inGroup ? (
              <p className="truncate text-[0.85rem] text-muted">
                {session.user.displayName}
              </p>
            ) : null}
            {session?.user ? <HelpButton /> : null}
            {session?.user ? (
              <UserMenu
                logoutAction={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              />
            ) : null}
          </div>
        </div>
      </header>
      <main className="app-main">{children}</main>
      {showNav ? <BottomNav slug={groupSlug} /> : null}
    </div>
  );
}

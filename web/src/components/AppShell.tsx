import { signOut } from "@/auth";
import { getSession } from "@/lib/auth-session";
import Link from "next/link";
import { BrandMark } from "./BrandMark";
import { BottomNav } from "./BottomNav";
import { LiveRefresh } from "./LiveRefresh";
import { PendingSubmitButton } from "./PendingSubmitButton";
import { ServiceWorkerRegister } from "./ServiceWorkerRegister";

export async function AppShell({
  children,
  title,
  subtitle,
  /** When set, shows coordination bottom nav for this group */
  groupSlug,
  /** Owner-only: link to group settings in the top bar */
  isGroupOwner,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  groupSlug?: string;
  isGroupOwner?: boolean;
}) {
  const session = await getSession();
  const inGroup = Boolean(groupSlug);

  return (
    <div className="app-shell">
      <ServiceWorkerRegister />
      {inGroup ? <LiveRefresh /> : null}
      <header className="app-header sticky top-0 z-30 border-b border-ink/6 bg-mist/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-5 py-3">
          {inGroup ? (
            <Link
              href="/"
              className="shrink-0 text-[0.8rem] font-medium text-muted"
            >
              ← Grupos
            </Link>
          ) : (
            <BrandMark compact />
          )}
          <div className="flex min-w-0 items-center gap-3">
            {inGroup && isGroupOwner && groupSlug ? (
              <Link
                href={`/grupos/${groupSlug}/ajustes`}
                className="shrink-0 text-[0.8rem] font-medium text-muted"
              >
                Ajustes de Grupo
              </Link>
            ) : null}
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
            {session?.user ? (
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <PendingSubmitButton
                  pendingLabel="…"
                  className="text-[0.8rem] font-medium text-muted"
                >
                  Salir
                </PendingSubmitButton>
              </form>
            ) : null}
          </div>
        </div>
      </header>
      <main className="app-main">{children}</main>
      {groupSlug ? <BottomNav slug={groupSlug} /> : null}
    </div>
  );
}

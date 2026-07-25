import { auth, signOut } from "@/auth";
import Link from "next/link";
import { BrandMark } from "./BrandMark";
import { BottomNav } from "./BottomNav";
import { PendingSubmitButton } from "./PendingSubmitButton";
import { ServiceWorkerRegister } from "./ServiceWorkerRegister";

export async function AppShell({
  children,
  title,
  subtitle,
  /** When set, shows coordination bottom nav for this group */
  groupSlug,
  groupName,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  groupSlug?: string;
  groupName?: string;
}) {
  const session = await auth();
  const inGroup = Boolean(groupSlug);

  return (
    <div className="app-shell">
      <ServiceWorkerRegister />
      <header className="sticky top-0 z-30 border-b border-ink/6 bg-mist/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-5 py-3">
          {inGroup ? (
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/"
                className="shrink-0 text-[0.8rem] font-medium text-muted"
              >
                ← Grupos
              </Link>
              <p className="truncate text-[0.95rem] font-semibold text-ink">
                {groupName ?? groupSlug}
              </p>
            </div>
          ) : (
            <BrandMark compact />
          )}
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

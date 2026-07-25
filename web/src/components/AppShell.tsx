import { signOut } from "@/auth";
import { getSession } from "@/lib/auth-session";
import { BrandMark } from "./BrandMark";
import { BottomNav } from "./BottomNav";
import { LiveRefresh } from "./LiveRefresh";
import { PendingSubmitButton } from "./PendingSubmitButton";
import { ServiceWorkerRegister } from "./ServiceWorkerRegister";

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

  return (
    <div className="app-shell">
      <ServiceWorkerRegister />
      {inGroup ? <LiveRefresh /> : null}
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
            {session?.user ? (
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <PendingSubmitButton
                  aria-label="Salir"
                  title="Salir"
                  pendingLabel=""
                  className="size-8 shrink-0 text-muted"
                >
                  <LogoutIcon />
                </PendingSubmitButton>
              </form>
            ) : null}
          </div>
        </div>
      </header>
      <main className="app-main">{children}</main>
      {showNav ? <BottomNav slug={groupSlug} /> : null}
    </div>
  );
}

function LogoutIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M14 12h6.5M17.5 8.5 21 12l-3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

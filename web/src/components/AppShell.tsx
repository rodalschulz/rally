import { auth, signOut } from "@/auth";
import { BrandMark } from "./BrandMark";
import { BottomNav } from "./BottomNav";
import { PendingSubmitButton } from "./PendingSubmitButton";
import { ServiceWorkerRegister } from "./ServiceWorkerRegister";

export async function AppShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const session = await auth();

  return (
    <div className="app-shell">
      <ServiceWorkerRegister />
      <header className="sticky top-0 z-30 border-b border-ink/6 bg-mist/80 backdrop-blur-xl">
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
            ) : session?.user ? (
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
      <BottomNav />
    </div>
  );
}

import { signOut } from "@/auth";
import { AppShell } from "@/components/AppShell";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { updateProfileAction } from "@/lib/actions/profile";
import { getSession } from "@/lib/auth-session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ajustes" };

export default async function UserSettingsPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  return (
    <AppShell title="Cuenta">
      <section className="animate-rise mb-6">
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-ink">
          Ajustes
        </h1>
        <p className="mt-1 text-[0.95rem] text-muted">
          Tu perfil en rally.
        </p>
      </section>

      <form action={updateProfileAction} className="animate-rise space-y-4">
        <label className="block text-[0.8rem] text-muted">
          Nombre
          <input
            name="displayName"
            required
            minLength={2}
            maxLength={40}
            defaultValue={session.user.displayName ?? ""}
            className="mt-1 w-full rounded-xl bg-sand px-3 py-3 text-ink"
          />
        </label>
        {session.user.email ? (
          <label className="block text-[0.8rem] text-muted">
            Email
            <input
              value={session.user.email}
              disabled
              className="mt-1 w-full rounded-xl bg-sand/60 px-3 py-3 text-muted"
            />
          </label>
        ) : null}
        <PendingSubmitButton
          pendingLabel="Guardando…"
          className="w-full rounded-2xl bg-ball py-3.5 text-[1rem] font-semibold text-on-ball"
        >
          Guardar
        </PendingSubmitButton>
      </form>

      <form
        className="mt-8"
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <PendingSubmitButton
          pendingLabel="…"
          className="w-full rounded-2xl bg-sand py-3.5 text-[1rem] font-medium text-muted ring-1 ring-ink/10"
        >
          Salir
        </PendingSubmitButton>
      </form>
    </AppShell>
  );
}

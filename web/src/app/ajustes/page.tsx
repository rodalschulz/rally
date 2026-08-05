import { signOut } from "@/auth";
import { AppShell } from "@/components/AppShell";
import { AvatarStickerPicker } from "@/components/AvatarStickerPicker";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";
import { NotificationSettings } from "@/components/NotificationSettings";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { updateProfileAction } from "@/lib/actions/profile";
import { userIsAppAdmin } from "@/lib/admin";
import { getSession } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ajustes" };

export default async function UserSettingsPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  const isAppAdmin = await userIsAppAdmin(session.user.id);
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatarUrl: true, hue: true, shortName: true, displayName: true },
  });

  const player = {
    id: session.user.id,
    displayName: dbUser?.displayName || session.user.displayName || "Jugador",
    shortName: dbUser?.shortName || session.user.shortName || "J",
    hue: dbUser?.hue ?? session.user.hue,
    avatarUrl: dbUser?.avatarUrl ?? null,
  };

  return (
    <AppShell title="Cuenta">
      <section className="animate-rise mb-6">
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-ink">
          Ajustes
        </h1>
        <p className="mt-1 text-[0.95rem] text-muted">
          Tu perfil en rally.
        </p>
        {isAppAdmin ? (
          <p className="mt-3 rounded-xl bg-sand px-3 py-2.5 text-[0.85rem] text-ink ring-1 ring-ink/8">
            <span className="font-medium">Admin de la app</span>
            <span className="text-muted">
              {" "}
              · puedes editar/borrar fechas, cambiar asistencias y saldar
              deudas de fechas pasadas en los grupos donde eres miembro.
            </span>
          </p>
        ) : null}
      </section>

      <div className="mb-6">
        <AvatarStickerPicker player={player} />
      </div>

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

      <NotificationSettings isAppAdmin={isAppAdmin} />

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

      <section className="mt-10 animate-rise">
        <p className="mb-2 text-[0.8rem] text-muted">Zona de peligro</p>
        <DeleteAccountButton />
      </section>
    </AppShell>
  );
}

import { signOut } from "@/auth";
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
export const metadata = { title: "Ajustes de Usuario" };

export default async function UserSettingsPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  const isAppAdmin = await userIsAppAdmin(session.user.id);
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      avatarUrl: true,
      hue: true,
      shortName: true,
      displayName: true,
      paymentPhone: true,
      paymentWallet: true,
    },
  });

  const player = {
    id: session.user.id,
    displayName: dbUser?.displayName || session.user.displayName || "Jugador",
    shortName: dbUser?.shortName || session.user.shortName || "J",
    hue: dbUser?.hue ?? session.user.hue ?? 160,
    avatarUrl: dbUser?.avatarUrl ?? null,
  };

  return (
    <>
      <section className="animate-rise mb-6">
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-ink">
          Ajustes de Usuario
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

        <fieldset className="min-w-0 space-y-3 rounded-2xl bg-sand px-4 py-4">
          <legend className="px-1 text-[0.85rem] font-medium text-ink">
            Cobro de deudas
          </legend>
          <p className="text-[0.8rem] leading-snug text-muted">
            Tu celular de Yape o Plin. Los miembros del grupo lo ven cuando te
            deben, para transferirte fuera de rally.
          </p>
          <label className="block min-w-0 text-[0.8rem] text-muted">
            Celular
            <input
              name="paymentPhone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="987 654 321"
              maxLength={16}
              defaultValue={dbUser?.paymentPhone ?? ""}
              className="mt-1 w-full min-w-0 rounded-xl bg-mist px-3 py-3 text-ink"
            />
          </label>
          <label className="block min-w-0 text-[0.8rem] text-muted">
            Prefieres recibir en
            <select
              name="paymentWallet"
              defaultValue={dbUser?.paymentWallet ?? "either"}
              className="mt-1 w-full min-w-0 rounded-xl bg-mist px-3 py-3 text-ink"
            >
              <option value="either">Yape o Plin</option>
              <option value="yape">Yape</option>
              <option value="plin">Plin</option>
            </select>
          </label>
        </fieldset>

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
    </>
  );
}

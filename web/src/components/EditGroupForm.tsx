import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { updateGroupAction } from "@/lib/actions/groups";

export function EditGroupForm({
  groupId,
  slug,
  name,
  maxMembers,
  memberCount,
  isPrivate,
}: {
  groupId: string;
  slug: string;
  name: string;
  maxMembers: number;
  memberCount: number;
  isPrivate: boolean;
}) {
  return (
    <form action={updateGroupAction} className="animate-rise space-y-4">
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="slug" value={slug} />
      <label className="block text-[0.8rem] text-muted">
        Nombre
        <input
          name="name"
          required
          defaultValue={name}
          className="mt-1 w-full rounded-xl bg-sand px-3 py-3 text-ink"
        />
      </label>
      <label className="block text-[0.8rem] text-muted">
        Máximo de miembros
        <input
          type="number"
          name="maxMembers"
          min={Math.max(2, memberCount)}
          max={200}
          defaultValue={maxMembers}
          required
          className="mt-1 w-full rounded-xl bg-sand px-3 py-3 text-ink"
        />
        <span className="mt-1 block text-[0.75rem] text-muted">
          Ahora hay {memberCount}. No puede bajar de eso.
        </span>
      </label>
      {isPrivate ? (
        <label className="block text-[0.8rem] text-muted">
          Nueva contraseña
          <input
            type="password"
            name="password"
            minLength={4}
            autoComplete="new-password"
            placeholder="Dejar vacío para no cambiar"
            className="mt-1 w-full rounded-xl bg-sand px-3 py-3 text-ink"
          />
          <span className="mt-1 block text-[0.75rem] text-muted">
            Se pide al unirse con el link de invitación. Mín. 4 caracteres.
          </span>
        </label>
      ) : null}
      <PendingSubmitButton
        pendingLabel="Guardando…"
        className="w-full rounded-2xl bg-ball py-3.5 text-[1rem] font-semibold text-on-ball"
      >
        Guardar cambios
      </PendingSubmitButton>
    </form>
  );
}

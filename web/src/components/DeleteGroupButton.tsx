"use client";

import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { deleteGroupAction } from "@/lib/actions/groups";

export function DeleteGroupButton({ groupId }: { groupId: string }) {
  return (
    <form
      action={deleteGroupAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            "¿Eliminar este grupo? Se borran todas las fechas, deudas, partidos y membresías. No se puede deshacer.",
          )
        ) {
          e.preventDefault();
        }
      }}
      className="mt-4"
    >
      <input type="hidden" name="groupId" value={groupId} />
      <PendingSubmitButton
        pendingLabel="Eliminando…"
        className="w-full rounded-2xl bg-mist-2 py-3.5 text-[0.95rem] font-medium text-danger"
      >
        Eliminar grupo
      </PendingSubmitButton>
    </form>
  );
}

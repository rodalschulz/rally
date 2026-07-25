"use client";

import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { leaveGroupAction } from "@/lib/actions/groups";

export function LeaveGroupButton({
  groupId,
  isSoleMember,
  isOwner,
}: {
  groupId: string;
  isSoleMember: boolean;
  isOwner: boolean;
}) {
  const confirmMessage = isSoleMember
    ? "Eres el único miembro. Al salir se elimina el grupo y todas sus fechas, deudas y partidos. ¿Continuar?"
    : isOwner
      ? "¿Salir del grupo? Se transferirá el dueño a otro integrante."
      : "¿Salir de este grupo? Dejarás de ver sus fechas y deudas.";

  return (
    <form
      action={leaveGroupAction}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
      className="mt-10"
    >
      <input type="hidden" name="groupId" value={groupId} />
      <PendingSubmitButton
        pendingLabel="Saliendo…"
        className="w-full rounded-2xl bg-mist-2 py-3.5 text-[0.95rem] font-medium text-danger"
      >
        {isSoleMember ? "Salir y eliminar grupo" : "Salir del grupo"}
      </PendingSubmitButton>
    </form>
  );
}

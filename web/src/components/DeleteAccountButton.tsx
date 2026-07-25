"use client";

import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { deleteAccountAction } from "@/lib/actions/profile";

export function DeleteAccountButton() {
  return (
    <form
      action={deleteAccountAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            "¿Borrar tu cuenta? Saldrás de todos los grupos. Si eres el único miembro de alguno, ese grupo se elimina. Esta acción no se puede deshacer.",
          )
        ) {
          e.preventDefault();
        }
      }}
      className="mt-4"
    >
      <PendingSubmitButton
        pendingLabel="Borrando…"
        className="w-full rounded-2xl bg-mist-2 py-3.5 text-[0.95rem] font-medium text-danger"
      >
        Borrar cuenta
      </PendingSubmitButton>
    </form>
  );
}

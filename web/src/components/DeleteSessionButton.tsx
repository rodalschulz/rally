"use client";

import { deletePlaySessionAction } from "@/lib/actions/sessions";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";

export function DeleteSessionButton({ playSessionId }: { playSessionId: string }) {
  return (
    <form
      action={deletePlaySessionAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            "¿Borrar esta fecha? Se eliminan asistencias, deudas y resultados. Esos resultados dejan de contar en el ranking.",
          )
        ) {
          e.preventDefault();
        }
      }}
      className="mt-10"
    >
      <input type="hidden" name="playSessionId" value={playSessionId} />
      <PendingSubmitButton
        pendingLabel="Borrando…"
        className="w-full rounded-2xl bg-mist-2 py-3.5 text-[0.95rem] font-medium text-danger"
      >
        Borrar fecha
      </PendingSubmitButton>
    </form>
  );
}

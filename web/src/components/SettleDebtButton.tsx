"use client";

import { settleDebtAction } from "@/lib/actions/sessions";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";

export function SettleDebtButton({
  debtId,
  fromName,
  toName,
  amountLabel,
  confirmMessage,
}: {
  debtId: string;
  fromName: string;
  toName: string;
  amountLabel: string;
  confirmMessage?: string;
}) {
  const message =
    confirmMessage ??
    `¿Saldar la deuda de ${fromName} a ${toName} por ${amountLabel}?`;
  return (
    <form
      action={settleDebtAction}
      onSubmit={(e) => {
        if (!window.confirm(message)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="debtId" value={debtId} />
      <PendingSubmitButton
        pendingLabel="…"
        className="text-[0.75rem] font-medium text-muted"
      >
        Saldar
      </PendingSubmitButton>
    </form>
  );
}

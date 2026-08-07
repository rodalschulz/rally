"use client";

import { settleDebtAction } from "@/lib/actions/sessions";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";

export function SettleDebtButton({
  debtId,
  fromName,
  toName,
  amountLabel,
}: {
  debtId: string;
  fromName: string;
  toName: string;
  amountLabel: string;
}) {
  return (
    <form
      action={settleDebtAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `¿Saldar la deuda de ${fromName} a ${toName} por ${amountLabel}?`,
          )
        ) {
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

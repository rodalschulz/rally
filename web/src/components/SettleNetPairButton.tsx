"use client";

import { settleNetPairAction } from "@/lib/actions/sessions";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";

export function SettleNetPairButton({
  debtIds,
  confirmMessage,
  label,
}: {
  debtIds: string[];
  confirmMessage: string;
  label: string;
}) {
  if (debtIds.length < 2) return null;
  return (
    <form
      action={settleNetPairAction}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      <input type="hidden" name="debtIds" value={debtIds.join(",")} />
      <PendingSubmitButton
        pendingLabel="…"
        className="text-[0.75rem] font-medium text-muted"
      >
        {label}
      </PendingSubmitButton>
    </form>
  );
}

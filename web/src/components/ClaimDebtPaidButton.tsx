"use client";

import { claimDebtPaidAction } from "@/lib/actions/sessions";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";

export function ClaimDebtPaidButton({
  debtIds,
  claimed,
}: {
  debtIds: string[];
  claimed?: boolean;
}) {
  if (debtIds.length === 0) return null;
  return (
    <form action={claimDebtPaidAction}>
      <input type="hidden" name="debtIds" value={debtIds.join(",")} />
      <PendingSubmitButton
        pendingLabel="…"
        className="text-[0.75rem] font-medium text-muted"
      >
        {claimed ? "Reavisar" : "Ya pagué"}
      </PendingSubmitButton>
    </form>
  );
}

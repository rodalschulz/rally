"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { claimDebtPaidAction } from "@/lib/actions/sessions";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import type { PaymentWallet } from "@/lib/domain/types";
import {
  buildDebtPayMessage,
  formatPaymentPhoneDisplay,
  paymentWalletLabel,
  whatsAppDebtUrl,
  type DebtPayLine,
} from "@/lib/debts/paymentProfile";
import { formatSoles } from "@/lib/format";

export type PayDebtSheetCreditor = {
  id: string;
  displayName: string;
  paymentPhone?: string | null;
  paymentWallet?: PaymentWallet | null;
};

export type PayDebtSheetDebt = DebtPayLine & {
  id: string;
  paymentClaimedAt?: string;
};

export function PayDebtSheet({
  open,
  onClose,
  creditor,
  debts,
}: {
  open: boolean;
  onClose: () => void;
  creditor: PayDebtSheetCreditor;
  debts: PayDebtSheetDebt[];
}) {
  const [portalReady, setPortalReady] = useState(false);
  const [copied, setCopied] = useState<"phone" | "amount" | "message" | null>(
    null,
  );

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(null), 1600);
    return () => window.clearTimeout(t);
  }, [copied]);

  if (!portalReady || !open || debts.length === 0) return null;

  const total = debts.reduce((s, d) => s + d.amount, 0);
  const message = buildDebtPayMessage({
    creditorName: creditor.displayName,
    debts,
  });
  const phone = creditor.paymentPhone ?? null;
  const wallet = paymentWalletLabel(creditor.paymentWallet);
  const waUrl = whatsAppDebtUrl(phone, message);
  const debtIds = debts.map((d) => d.id).join(",");
  const allClaimed = debts.every((d) => Boolean(d.paymentClaimedAt));

  async function copy(kind: "phone" | "amount" | "message", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
    } catch {
      // ignore
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-3 pb-[max(0.75rem,var(--safe-bottom))] sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pay-debt-title"
        className="flex max-h-[min(88dvh,36rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-sand shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink/6 px-4 py-3">
          <div className="min-w-0">
            <h2
              id="pay-debt-title"
              className="text-[1.05rem] font-semibold tracking-[-0.02em] text-ink"
            >
              Pagar a {creditor.displayName}
            </h2>
            <p className="mt-0.5 text-[0.85rem] text-muted">
              {formatSoles(total)}
              {debts.length > 1 ? ` · ${debts.length} fechas` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-[0.85rem] text-muted hover:bg-mist-2 hover:text-ink"
          >
            Cerrar
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <div className="rounded-xl bg-mist px-3 py-3">
            <p className="text-[0.75rem] text-muted">Recibe en {wallet}</p>
            {phone ? (
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="font-medium tabular-nums text-ink">
                  {formatPaymentPhoneDisplay(phone)}
                </p>
                <button
                  type="button"
                  onClick={() => copy("phone", phone)}
                  className="text-[0.8rem] font-medium text-muted hover:text-ink"
                >
                  {copied === "phone" ? "Copiado" : "Copiar"}
                </button>
              </div>
            ) : (
              <p className="mt-1 text-[0.85rem] text-muted">
                {creditor.displayName} aún no cargó su celular en Ajustes.
                Puedes avisarle por WhatsApp igual.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => copy("amount", total.toFixed(2))}
              className="rounded-xl bg-mist px-3 py-2 text-[0.85rem] font-medium text-ink"
            >
              {copied === "amount" ? "Monto copiado" : "Copiar monto"}
            </button>
            <button
              type="button"
              onClick={() => copy("message", message)}
              className="rounded-xl bg-mist px-3 py-2 text-[0.85rem] font-medium text-ink"
            >
              {copied === "message" ? "Mensaje copiado" : "Copiar mensaje"}
            </button>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-ball px-3 py-2 text-[0.85rem] font-semibold text-on-ball"
            >
              WhatsApp
            </a>
          </div>

          <p className="whitespace-pre-wrap rounded-xl bg-mist px-3 py-3 text-[0.8rem] leading-snug text-muted">
            {message}
          </p>

          <p className="text-[0.75rem] leading-snug text-muted">
            Transfiere en Yape o Plin. Después avisa aquí para que{" "}
            {creditor.displayName} confirme el cobro.
          </p>
        </div>

        <div className="border-t border-ink/6 px-4 py-3">
          <form
            action={async (formData) => {
              await claimDebtPaidAction(formData);
              onClose();
            }}
          >
            <input type="hidden" name="debtIds" value={debtIds} />
            <PendingSubmitButton
              pendingLabel="Avisando…"
              className="w-full rounded-2xl bg-ink py-3 text-[0.95rem] font-semibold text-sand"
            >
              {allClaimed ? "Volver a avisar que ya pagué" : "Ya pagué — avisar"}
            </PendingSubmitButton>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function PayDebtButton({
  creditor,
  debts,
}: {
  creditor: PayDebtSheetCreditor;
  debts: PayDebtSheetDebt[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl bg-ball px-3 py-1.5 text-[0.8rem] font-semibold text-on-ball"
      >
        Pagar
      </button>
      <PayDebtSheet
        open={open}
        onClose={() => setOpen(false)}
        creditor={creditor}
        debts={debts}
      />
    </>
  );
}

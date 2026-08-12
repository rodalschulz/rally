import type { PaymentWallet } from "@/lib/domain/types";
import { formatSessionChip, formatSessionWhen, formatSoles } from "@/lib/format";

const PE_MOBILE = /^9\d{8}$/;

/**
 * Normalize a Peru mobile for Yape/Plin: strip spaces/+51/0, keep 9 digits.
 * Returns null if empty or invalid.
 */
export function normalizePaymentPhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("51") && digits.length === 11) {
    digits = digits.slice(2);
  }
  if (digits.startsWith("0") && digits.length === 10) {
    digits = digits.slice(1);
  }
  if (!PE_MOBILE.test(digits)) return null;
  return digits;
}

export function parsePaymentWallet(raw: string): PaymentWallet | null {
  if (raw === "yape" || raw === "plin" || raw === "either") return raw;
  return null;
}

export function paymentWalletLabel(wallet: PaymentWallet | null | undefined): string {
  switch (wallet) {
    case "yape":
      return "Yape";
    case "plin":
      return "Plin";
    case "either":
      return "Yape o Plin";
    default:
      return "Yape o Plin";
  }
}

/** Display as 999 999 999 for copy UX. */
export function formatPaymentPhoneDisplay(phone: string): string {
  if (phone.length !== 9) return phone;
  return `${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`;
}

export type DebtPayLine = {
  amount: number;
  sessionStartsAt: string;
  sessionCourtLabel?: string;
};

/** WhatsApp / clipboard message when settling debts to a creditor. */
export function buildDebtPayMessage(args: {
  creditorName: string;
  debts: DebtPayLine[];
}): string {
  const total = args.debts.reduce((s, d) => s + d.amount, 0);
  const lines = args.debts.map((d) => {
    const when = formatSessionWhen(d.sessionStartsAt);
    const chip = formatSessionChip(d.sessionStartsAt);
    const court = d.sessionCourtLabel ? ` · ${d.sessionCourtLabel}` : "";
    return `· ${formatSoles(d.amount)} — ${chip} · ${when.time}${court}`;
  });
  const intro =
    args.debts.length === 1
      ? `Hola ${args.creditorName}, te transferiré ${formatSoles(total)} por la fecha:`
      : `Hola ${args.creditorName}, te transferiré ${formatSoles(total)} por estas fechas:`;
  return [intro, ...lines].join("\n");
}

/** wa.me link; without phone opens chat picker with prefilled text. */
export function whatsAppDebtUrl(phone: string | null | undefined, text: string): string {
  const encoded = encodeURIComponent(text);
  if (phone && PE_MOBILE.test(phone)) {
    return `https://wa.me/51${phone}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}

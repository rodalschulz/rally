import { describe, expect, it } from "vitest";
import {
  buildDebtPayMessage,
  formatPaymentPhoneDisplay,
  normalizePaymentPhone,
  parsePaymentWallet,
  paymentWalletLabel,
  whatsAppDebtUrl,
} from "./paymentProfile";

describe("normalizePaymentPhone", () => {
  it("accepts 9-digit PE mobile", () => {
    expect(normalizePaymentPhone("987654321")).toBe("987654321");
    expect(normalizePaymentPhone("987 654 321")).toBe("987654321");
    expect(normalizePaymentPhone("+51 987 654 321")).toBe("987654321");
    expect(normalizePaymentPhone("51987654321")).toBe("987654321");
  });

  it("rejects invalid", () => {
    expect(normalizePaymentPhone("")).toBeNull();
    expect(normalizePaymentPhone("123")).toBeNull();
    expect(normalizePaymentPhone("187654321")).toBeNull();
  });
});

describe("parsePaymentWallet", () => {
  it("parses known values", () => {
    expect(parsePaymentWallet("yape")).toBe("yape");
    expect(parsePaymentWallet("plin")).toBe("plin");
    expect(parsePaymentWallet("either")).toBe("either");
    expect(parsePaymentWallet("other")).toBeNull();
  });
});

describe("labels and display", () => {
  it("formats phone and wallet labels", () => {
    expect(formatPaymentPhoneDisplay("987654321")).toBe("987 654 321");
    expect(paymentWalletLabel("yape")).toBe("Yape");
    expect(paymentWalletLabel(null)).toBe("Yape o Plin");
  });
});

describe("buildDebtPayMessage", () => {
  it("builds a single-debt message", () => {
    const msg = buildDebtPayMessage({
      creditorName: "Ana",
      debts: [
        {
          amount: 11,
          sessionStartsAt: "2026-08-12T20:00:00.000Z",
          sessionCourtLabel: "Cancha 3",
        },
      ],
    });
    expect(msg).toContain("Ana");
    expect(msg).toContain("S/");
    expect(msg).toContain("Cancha 3");
  });

  it("builds a multi-debt message with total", () => {
    const msg = buildDebtPayMessage({
      creditorName: "Ana",
      debts: [
        { amount: 11, sessionStartsAt: "2026-08-12T20:00:00.000Z" },
        { amount: 22, sessionStartsAt: "2026-08-13T20:00:00.000Z" },
      ],
    });
    expect(msg).toContain("estas fechas");
    expect(msg).toContain("S/");
  });
});

describe("whatsAppDebtUrl", () => {
  it("uses PE country code when phone is set", () => {
    const url = whatsAppDebtUrl("987654321", "hola");
    expect(url).toBe("https://wa.me/51987654321?text=hola");
  });

  it("opens picker without phone", () => {
    expect(whatsAppDebtUrl(null, "hola")).toBe("https://wa.me/?text=hola");
  });
});

import type { Currency } from "@/domain/operation";

// ----- Currency -----

const CURRENCY_LOCALE: Record<Currency, string> = {
  USD: "en-US",
  EUR: "de-DE",
  BRL: "pt-BR",
  CNY: "zh-CN",
  GBP: "en-GB",
};

export function formatCurrency(value: number, currency: Currency | string): string {
  const cur = (currency as Currency) in CURRENCY_LOCALE ? (currency as Currency) : "USD";
  if (!Number.isFinite(value)) return `${cur} 0,00`;
  const formatted = new Intl.NumberFormat(CURRENCY_LOCALE[cur], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${cur} ${formatted}`;
}

// Parse user input (accepts "1.500,00" / "1,500.00" / "1500") into a number.
export function parseCurrencyInput(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^\d.,-]/g, "");
  // If both separators exist, the rightmost is the decimal mark.
  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");
  let normalised = cleaned;
  if (lastDot !== -1 && lastComma !== -1) {
    if (lastComma > lastDot) {
      normalised = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      normalised = cleaned.replace(/,/g, "");
    }
  } else if (lastComma !== -1) {
    normalised = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    normalised = cleaned.replace(/,/g, "");
  }
  const n = Number(normalised);
  return Number.isFinite(n) ? n : 0;
}

// Mask while typing — keeps a clean grouped numeric string with 2 decimals.
export function maskCurrencyInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const padded = digits.padStart(3, "0");
  const intPart = padded.slice(0, -2).replace(/^0+(?=\d)/, "");
  const decPart = padded.slice(-2);
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${grouped}.${decPart}`;
}

// ----- IBAN / SWIFT / DUIMP -----

export function maskIBAN(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 34)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

export function maskSWIFT(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11);
}

// DUIMP format: NN/NNNNNNN-N
export function maskDUIMP(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  const a = digits.slice(0, 2);
  const b = digits.slice(2, 9);
  const c = digits.slice(9, 10);
  let out = a;
  if (b) out += "/" + b;
  if (c) out += "-" + c;
  return out;
}

export function maskInvoice(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9\-]/g, "").slice(0, 40);
}

// ----- Generic number formatter -----
export function formatNumber(value: number, fractionDigits = 2): string {
  if (!Number.isFinite(value)) return "0";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}

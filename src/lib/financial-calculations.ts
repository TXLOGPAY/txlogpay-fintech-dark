import { USD_FX_RATES } from "@/lib/formatters";

export type FxRates = Record<string, number>;

type FinancialOperation = {
  currency?: string | null;
  operation_value?: number | null;
  total_fees?: number | null;
  protected_amount?: number | null;
  fee_amount?: number | null;
};

export type FinancialTotal = {
  amount: number;
  currency: string;
  isConverted: boolean;
  fxTimestamp: string | null;
};

type FxSnapshot = { rates: FxRates; fxTimestamp: string; source: string };

const FX_CACHE_TTL_MS = 5 * 60 * 1000;
let fxCache: (FxSnapshot & { expiresAt: number }) | null = null;

const cleanCurrency = (currency?: string | null) => (currency || "USD").toUpperCase();

export function getTotalFees(operation: FinancialOperation): number {
  const explicitFees = Number(operation.total_fees ?? 0);
  if (Number.isFinite(explicitFees) && explicitFees > 0) return explicitFees;
  const feeAmount = Number(operation.fee_amount ?? 0);
  return Number.isFinite(feeAmount) ? feeAmount : 0;
}

export function getProtectedAmount(operation: FinancialOperation): number {
  const operationValue = Number(operation.operation_value ?? 0);
  if (Number.isFinite(operationValue) && operationValue > 0) {
    return Math.max(0, operationValue - getTotalFees(operation));
  }
  const protectedAmount = Number(operation.protected_amount ?? 0);
  return Number.isFinite(protectedAmount) ? protectedAmount : 0;
}

export function toUsdAmount(value: number, currency: string = "USD", rates: FxRates = USD_FX_RATES): number {
  const cur = cleanCurrency(currency);
  const numericValue = Number(value) || 0;
  const rate = Number(rates[cur] ?? USD_FX_RATES[cur] ?? 1);
  return cur === "USD" ? numericValue : numericValue / (rate > 0 ? rate : 1);
}

function uniqueCurrencies(operations: FinancialOperation[]) {
  return [...new Set(operations.map((operation) => cleanCurrency(operation.currency)))];
}

export function calculateFinancialTotal(
  operations: FinancialOperation[],
  amountGetter: (operation: FinancialOperation) => number,
  rates: FxRates = USD_FX_RATES,
  fxTimestamp: string | null = null,
): FinancialTotal {
  const currencies = uniqueCurrencies(operations);
  if (currencies.length === 1) {
    return {
      amount: operations.reduce((sum, operation) => sum + amountGetter(operation), 0),
      currency: currencies[0] ?? "USD",
      isConverted: false,
      fxTimestamp,
    };
  }

  return {
    amount: operations.reduce(
      (sum, operation) => sum + toUsdAmount(amountGetter(operation), cleanCurrency(operation.currency), rates),
      0,
    ),
    currency: "USD",
    isConverted: currencies.length > 1,
    fxTimestamp,
  };
}

export function calculateProtectedTotal(
  operations: FinancialOperation[],
  rates: FxRates = USD_FX_RATES,
  fxTimestamp: string | null = null,
): FinancialTotal {
  return calculateFinancialTotal(operations, getProtectedAmount, rates, fxTimestamp);
}

async function fetchJsonRates(url: string): Promise<FxRates | null> {
  const response = await fetch(url);
  if (!response.ok) return null;
  const json: { rates?: Record<string, number> } = await response.json();
  return json.rates ?? null;
}

export async function fetchUsdBaseRates(): Promise<FxSnapshot> {
  const now = Date.now();
  if (fxCache && fxCache.expiresAt > now) {
    return { rates: fxCache.rates, fxTimestamp: fxCache.fxTimestamp, source: fxCache.source };
  }

  const sources = [
    { url: "https://api.exchangerate.host/latest?base=USD", source: "exchangerate.host" },
    { url: "https://open.er-api.com/v6/latest/USD", source: "open.er-api.com" },
  ];

  for (const source of sources) {
    try {
      const rates = await fetchJsonRates(source.url);
      if (rates?.USD === 1 || rates?.GBP || rates?.CNY || rates?.EUR) {
        const snapshot = {
          rates: { ...USD_FX_RATES, ...rates, USD: 1 },
          fxTimestamp: new Date().toISOString(),
          source: source.source,
        };
        fxCache = { ...snapshot, expiresAt: now + FX_CACHE_TTL_MS };
        return snapshot;
      }
    } catch {
      // Try the next FX source, then fall back to the static institutional reference.
    }
  }

  const fallback = { rates: USD_FX_RATES, fxTimestamp: new Date().toISOString(), source: "fallback" };
  fxCache = { ...fallback, expiresAt: now + FX_CACHE_TTL_MS };
  return fallback;
}
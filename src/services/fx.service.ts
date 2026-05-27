// FX service — returns a stable USD conversion snapshot from local rates.

import { USD_FX_RATES } from "@/lib/formatters";

export interface FxQuote {
  currency: string;
  rate: number; // 1 unit of `currency` = `rate` USD
  reference_date: string; // ISO timestamp
  source: "frankfurter" | "fallback";
}

const CACHE = new Map<string, { quote: FxQuote; at: number }>();
const TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getUsdRate(currency: string): Promise<FxQuote> {
  const cur = (currency || "USD").toUpperCase();
  const now = Date.now();
  if (cur === "USD") {
    return {
      currency: "USD",
      rate: 1,
      reference_date: new Date().toISOString(),
      source: "fallback",
    };
  }
  const cached = CACHE.get(cur);
  if (cached && now - cached.at < TTL_MS) return cached.quote;

  const usdBaseRate = USD_FX_RATES[cur] ?? 1;
  const fallback = cur === "USD" ? 1 : 1 / (usdBaseRate > 0 ? usdBaseRate : 1);
  const quote: FxQuote = {
    currency: cur,
    rate: fallback,
    reference_date: new Date().toISOString(),
    source: "fallback",
  };
  CACHE.set(cur, { quote, at: now });
  return quote;
}

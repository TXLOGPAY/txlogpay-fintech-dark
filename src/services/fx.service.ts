// FX service — fetches live USD conversion rate with a static fallback.
// Source: frankfurter.app (free, no API key). Fallback to USD_FX_RATES.

import { USD_FX_RATES } from "@/lib/formatters";

export interface FxQuote {
  currency: string;
  rate: number;             // 1 unit of `currency` = `rate` USD
  reference_date: string;   // ISO timestamp
  source: "frankfurter" | "fallback";
}

const CACHE = new Map<string, { quote: FxQuote; at: number }>();
const TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getUsdRate(currency: string): Promise<FxQuote> {
  const cur = (currency || "USD").toUpperCase();
  const now = Date.now();
  if (cur === "USD") {
    return { currency: "USD", rate: 1, reference_date: new Date().toISOString(), source: "fallback" };
  }
  const cached = CACHE.get(cur);
  if (cached && now - cached.at < TTL_MS) return cached.quote;

  try {
    // frankfurter.app — base currency → USD
    const res = await fetch(`https://api.frankfurter.app/latest?from=${cur}&to=USD`);
    if (res.ok) {
      const json: { rates?: { USD?: number }; date?: string } = await res.json();
      const rate = json?.rates?.USD;
      if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) {
        const quote: FxQuote = {
          currency: cur,
          rate,
          reference_date: json.date ? `${json.date}T00:00:00.000Z` : new Date().toISOString(),
          source: "frankfurter",
        };
        CACHE.set(cur, { quote, at: now });
        return quote;
      }
    }
  } catch {
    // fall through
  }

  const usdBaseRate = USD_FX_RATES[cur] ?? 1;
  const fallback = cur === "USD" ? 1 : 1 / (usdBaseRate > 0 ? usdBaseRate : 1);
  return {
    currency: cur,
    rate: fallback,
    reference_date: new Date().toISOString(),
    source: "fallback",
  };
}

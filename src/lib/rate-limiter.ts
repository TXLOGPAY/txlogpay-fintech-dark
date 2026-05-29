type WindowEntry = {
  count: number;
  resetAt: number;
};

const _store = new Map<string, WindowEntry>();

function pruneExpired() {
  const now = Date.now();
  for (const [key, entry] of _store) {
    if (now >= entry.resetAt) _store.delete(key);
  }
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterMs: number };

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  pruneExpired();
  const now = Date.now();
  const entry = _store.get(key);

  if (!entry || now >= entry.resetAt) {
    _store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= limit) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true };
}

export function assertRateLimit(key: string, limit: number, windowMs: number): void {
  const result = checkRateLimit(key, limit, windowMs);
  if (!result.allowed) {
    const mins = Math.ceil(result.retryAfterMs / 60_000);
    throw new Error(
      `Limite de requisições atingido. Tente novamente em ${mins} minuto${mins !== 1 ? "s" : ""}.`,
    );
  }
}

export const LIMITS = {
  WALLET_CREATION:  { limit: 5,  windowMs: 60 * 60 * 1000 },
  SETTLEMENT:       { limit: 3,  windowMs: 60 * 60 * 1000 },
  SETTLEMENT_OP:    { limit: 1,  windowMs: 24 * 60 * 60 * 1000 },
  OPERATION_CREATE: { limit: 10, windowMs: 60 * 60 * 1000 },
  RECEIPT_UPLOAD:   { limit: 10, windowMs: 60 * 60 * 1000 },
} as const;

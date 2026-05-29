import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { executeStellarSettlement } from "@/services/stellar.service";
import { assertRateLimit, LIMITS } from "@/lib/rate-limiter";

function generateConfirmationCode(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  const letters = Array.from({ length: 3 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26)),
  ).join("");
  return `TXL-${num}-${letters}`;
}

export const executeSettlement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      operationId: z.string().uuid(),
      currency: z.string().min(3).max(5),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const currency = data.currency.toUpperCase();

    // Per-user hourly limit — prevents DoS via mass settlement requests
    assertRateLimit(
      `settlement:user:${userId}`,
      LIMITS.SETTLEMENT.limit,
      LIMITS.SETTLEMENT.windowMs,
    );
    // Per-operation daily limit — prevents replay attacks on the same operation
    assertRateLimit(
      `settlement:op:${data.operationId}`,
      LIMITS.SETTLEMENT_OP.limit,
      LIMITS.SETTLEMENT_OP.windowMs,
    );

    // Idempotency: return existing successful settlement if present
    const { data: existing } = await supabase
      .from("settlements" as never)
      .select("*")
      .eq("operation_id", data.operationId)
      .eq("successful", true)
      .maybeSingle();

    if (existing) return existing;

    const result = await executeStellarSettlement({ amount: "10", currency });

    const row = {
      operation_id: data.operationId,
      user_id: userId,
      stellar_tx_hash: result.hash,
      transaction_hash: result.hash,
      ledger: result.ledger ?? null,
      amount: 10,
      asset: "XLM",
      asset_code: `${currency}TX`,
      operation_currency: currency,
      source_wallet: result.sourceWallet,
      destination_wallet: result.destinationWallet,
      confirmation_code: generateConfirmationCode(),
      network: "stellar-testnet",
      status: result.successful ? "CONFIRMED" : "FAILED",
      successful: !!result.successful,
    };

    const { data: settlement, error } = await supabase
      .from("settlements" as never)
      .insert(row as never)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    await supabase
      .from("operations")
      .update({
        settlement_wallet: result.destinationWallet,
        settlement_status: result.successful ? "CONFIRMED" : "FAILED",
      } as unknown as never)
      .eq("id", data.operationId);

    return settlement;
  });

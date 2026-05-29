import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import * as StellarSdk from "@stellar/stellar-sdk";
import { assertRateLimit, LIMITS } from "@/lib/rate-limiter";

/**
 * DEBUG — Teste isolado da engine Stellar Testnet.
 * Gera um Keypair, fundeia via Friendbot e persiste APENAS a public key
 * em operations.operation_wallet. A secret key NUNCA sai do servidor.
 */
export const createOperationWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ operationId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    assertRateLimit(
      `wallet:${userId}`,
      LIMITS.WALLET_CREATION.limit,
      LIMITS.WALLET_CREATION.windowMs,
    );

    const { data: operation } = await supabase
      .from("operations")
      .select("*")
      .eq("id", data.operationId)
      .single();

    if (!operation) {
      throw new Error("Operation not found");
    }

    const pair = StellarSdk.Keypair.random();
    const publicKey = pair.publicKey();

    const fb = await fetch(
      `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`,
    );

    if (!fb.ok) {
      throw new Error(`Friendbot falhou (${fb.status})`);
    }

    const { error } = await supabase
      .from("operations")
      .update({ operation_wallet: publicKey })
      .eq("id", data.operationId)
      .eq("user_id", userId);

    if (error) throw new Error(error.message);

    return { publicKey };
  })
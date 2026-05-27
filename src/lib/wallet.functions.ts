import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import * as StellarSdk from "@stellar/stellar-sdk";

const server = new StellarSdk.Horizon.Server(
  "https://horizon-testnet.stellar.org"
);

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

  console.log("START WALLET CREATION");

  const pair = StellarSdk.Keypair.random();
  const publicKey = pair.publicKey();

  console.log("KEYPAIR CREATED", publicKey);

  // FRIEND BOT TEMPORARIAMENTE DESABILITADO

  const fb = await fetch(
    `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`,
  );

  if (!fb.ok) {
    throw new Error(`Friendbot falhou (${fb.status})`);
  }


  const { data: operation } = await supabase
  .from("operations")
  .select("*")
  .eq("id", data.operationId)
  .single();

  if (!operation) {
    const assetCode = `${operation.currency}TX`;
    console.log("ASSET CODE", assetCode);
    throw new Error("Operation not found");
  }

  

  console.log("SAVING SUPABASE");

  const { error } = await supabase
    .from("operations")
    .update({ operation_wallet: publicKey })
    .eq("id", data.operationId)
    .eq("user_id", userId);

  if (error) {
    console.error("SUPABASE ERROR", error);
    throw new Error(error.message);
  }

  console.log("WALLET SAVED");

  return { publicKey };
})
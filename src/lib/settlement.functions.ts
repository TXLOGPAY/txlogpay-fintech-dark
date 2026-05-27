import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  createFundedWallet,
  establishTrustline,
  getAsset,
  sendAsset,
  toStellarAmount,
} from "@/services/stellar-assets.server";

/**
 * Executa a liquidação internacional tokenizada.
 *
 * Pré-requisito: `operation_wallet` + `operation_wallet_secret` já
 * persistidos (criados na validação da garantia).
 *
 * Fluxo:
 *  1. Cria settlement_wallet (funded via friendbot)
 *  2. Trustline da settlement_wallet → asset operacional (USDTX/…)
 *  3. Transfere o asset da operation_wallet → settlement_wallet
 *  4. Persiste settlement row + atualiza operations.settlement_wallet/status
 */
export const executeSettlement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ operationId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    console.log("EXECUTE SETTLEMENT START", data.operationId);

    const { data: operation, error: opErr } = await supabase
      .from("operations")
      .select("*")
      .eq("id", data.operationId)
      .single();

    if (opErr || !operation) throw new Error("Operation not found");

    if (!operation.operation_wallet || !operation.operation_wallet_secret) {
      throw new Error(
        "operation_wallet ausente. Valide a garantia antes do settlement.",
      );
    }

    const currency = operation.currency ?? "USD";
    const operationValue = Number(operation.operation_value ?? 0);
    const amount = toStellarAmount(operationValue || 1);

    // Idempotência — se já existe settlement confirmado, retorna.
    const { data: existingSettlement } = await supabase
      .from("settlements" as never)
      .select("*")
      .eq("operation_id", data.operationId)
      .eq("status", "CONFIRMED")
      .maybeSingle();

    if (existingSettlement) {
      console.log("SETTLEMENT ALREADY EXISTS");
      return existingSettlement;
    }

    // 1. Asset operacional (já existe — issuer foi criado na validação)
    const { asset, code } = await getAsset(currency);

    // 2. Settlement wallet financiada
    const settlementKp = await createFundedWallet();
    console.log("SETTLEMENT WALLET FUNDED", settlementKp.publicKey());

    // 3. Trustline da settlement wallet
    await establishTrustline(settlementKp.secret(), asset);
    console.log("SETTLEMENT TRUSTLINE ESTABLISHED");

    // 4. Transferência operação → settlement
    const tx = await sendAsset(
      operation.operation_wallet_secret as string,
      settlementKp.publicKey(),
      asset,
      amount,
    );
    console.log("SETTLEMENT TRANSFER", tx.hash, tx.successful);

    if (!tx.successful) throw new Error("Stellar transfer failed");

    const confirmationCode = `TXL-${Math.floor(100000 + Math.random() * 900000)}-${
      Array.from({ length: 3 }, () =>
        String.fromCharCode(65 + Math.floor(Math.random() * 26)),
      ).join("")
    }`;

    // 5a. Persiste settlement row
    const settlementRow = {
      operation_id: data.operationId,
      user_id: userId,
      tx_hash: tx.hash,
      ledger: tx.ledger ?? null,
      amount: operationValue || 1,
      asset: code,
      asset_code: code,
      operation_currency: currency.toUpperCase(),
      source_wallet: operation.operation_wallet,
      destination_wallet: settlementKp.publicKey(),
      confirmation_code: confirmationCode,
      network: "stellar-testnet",
      status: "CONFIRMED",
      successful: true,
    };

    const { data: inserted, error: insErr } = await supabase
      .from("settlements" as never)
      .insert(settlementRow as never)
      .select("*")
      .single();

    if (insErr) {
      console.error("SETTLEMENT INSERT ERROR", insErr);
      throw insErr;
    }

    // 5b. Atualiza operations com settlement_wallet + status
    const completedAt = new Date().toISOString();
    const { error: updErr } = await supabase
      .from("operations")
      .update({
        settlement_wallet: settlementKp.publicKey(),
        settlement_wallet_secret: settlementKp.secret(),
        settlement_status: "CONFIRMED",
        settlement_completed_at: completedAt,
      } as never)
      .eq("id", data.operationId)
      .eq("user_id", userId);

    if (updErr) {
      console.error("OPERATION SETTLEMENT UPDATE ERROR", updErr);
    } else {
      console.log("SETTLEMENT WALLET SAVED", settlementKp.publicKey());
    }

    return inserted;
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireCloudAuth } from "@/lib/cloud-auth-middleware";
// NOTE: stellar-assets.server importado DINAMICAMENTE dentro do handler para
// evitar vazamento de código server-only (supabaseAdmin / client.server)
// para o bundle do browser via top-level imports.

/**
 * Cria a wallet operacional (custodial) na Stellar Testnet, estabelece
 * trustline para o asset tokenizado da moeda (USDTX/BRLTX/…), e EMITE
 * tokens equivalentes ao `operation_value` para essa wallet.
 *
 * Persiste em `operations`:
 *  - operation_wallet         (public key)
 *  - operation_wallet_secret  (secret — testnet)
 *  - asset_code               (USDTX, BRLTX, …)
 *
 * A secret NUNCA sai do servidor — fica apenas no banco para que o
 * settlement futuro possa assinar transações de saída.
 */
export const createOperationWallet = createServerFn({ method: "POST" })
  .middleware([requireCloudAuth])
  .inputValidator((input) =>
    z.object({ operationId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    console.log("START WALLET CREATION", data.operationId);

    const { data: operation, error: opErr } = await supabase
      .from("operations")
      .select("*")
      .eq("id", data.operationId)
      .single();

    if (opErr || !operation) throw new Error("Operation not found");

    // Se já existe, retorna idempotente.
    if (operation.operation_wallet && operation.operation_wallet_secret) {
      console.log("WALLET ALREADY EXISTS", operation.operation_wallet);
      return { publicKey: operation.operation_wallet, alreadyExists: true };
    }

    const currency = operation.currency ?? "USD";
    const operationValue = Number(operation.operation_value ?? 0);

    // Import dinâmico — server-only, fora do bundle client.
    const {
      createFundedWallet,
      establishTrustline,
      getAsset,
      sendAsset,
      toStellarAmount,
    } = await import("@/services/stellar-assets.server");

    // 1. Asset operacional (cria issuer se preciso)
    const { asset, issuerSecret, code } = await getAsset(currency);
    console.log("ASSET READY", code);

    // 2. Wallet operacional financiada via friendbot
    const walletKp = await createFundedWallet();
    console.log("OPERATION WALLET FUNDED", walletKp.publicKey());

    // 3. Trustline da wallet → asset
    await establishTrustline(walletKp.secret(), asset);
    console.log("TRUSTLINE ESTABLISHED");

    // 4. Issuer minta os tokens para a wallet
    const amount = toStellarAmount(operationValue || 1);
    const mintTx = await sendAsset(issuerSecret, walletKp.publicKey(), asset, amount);
    console.log("TOKENS MINTED", amount, code, mintTx.hash);

    // 5. Persiste TUDO (publicKey, secret, asset_code) atomicamente
    const { error } = await supabase
      .from("operations")
      .update({
        operation_wallet: walletKp.publicKey(),
        operation_wallet_secret: walletKp.secret(),
        asset_code: code,
      } as never)
      .eq("id", data.operationId)
      .eq("user_id", userId);

    if (error) {
      console.error("SUPABASE PERSIST ERROR", error);
      throw new Error(error.message);
    }

    console.log("OPERATION WALLET SAVED", walletKp.publicKey());

    return { publicKey: walletKp.publicKey(), assetCode: code, mintHash: mintTx.hash };
  });

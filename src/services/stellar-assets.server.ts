/**
 * SERVER-ONLY — Engine de assets tokenizados TXLOGPAY na Stellar Testnet.
 *
 * Responsabilidades:
 *  - Manter (lazy) uma issuing account por moeda (USDTX, BRLTX, EURTX, …)
 *  - Estabelecer trustlines em wallets de destino
 *  - Mintar (emitir) tokens da issuer → wallet
 *  - Transferir tokens entre wallets
 *
 * NÃO importar em código client — usa supabaseAdmin (service_role).
 */

import * as StellarSdk from "@stellar/stellar-sdk";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const HORIZON = "https://horizon-testnet.stellar.org";
const server = new StellarSdk.Horizon.Server(HORIZON);

function createRuntimeAdminClient() {
  const url = process.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    const missing = [
      ...(!url ? ["SUPABASE_URL"] : []),
      ...(!serviceRoleKey ? ["SUPABASE_SERVICE_ROLE_KEY"] : []),
    ];
    throw new Error(`Missing Supabase environment variable(s): ${missing.join(", ")}.`);
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

let runtimeAdmin: ReturnType<typeof createRuntimeAdminClient> | undefined;
function getRuntimeAdmin() {
  runtimeAdmin ??= createRuntimeAdminClient();
  return runtimeAdmin;
}

/** Mapeamento moeda fiduciária → asset operacional interno. */
export function getAssetCode(currency: string): string {
  const c = (currency ?? "USD").toUpperCase();
  return `${c}TX`;
}

async function fundWithFriendbot(publicKey: string): Promise<void> {
  const r = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`);
  if (!r.ok && r.status !== 400) {
    // 400 = já existe (ok). Outros códigos = falha real.
    const txt = await r.text().catch(() => "");
    throw new Error(`Friendbot failed (${r.status}): ${txt}`);
  }
}

// Cache em memória do Asset object (efêmero — workers são stateless mas
// ajuda no escopo do mesmo request).
const assetCache = new Map<string, StellarSdk.Asset>();

/**
 * Retorna (criando se necessário) a issuing account para a moeda.
 * Persistida em `platform_assets` — singleton por code.
 */
export async function ensureIssuer(currency: string): Promise<{
  code: string;
  issuerPublic: string;
  issuerSecret: string;
}> {
  const code = getAssetCode(currency);

  const supabaseAdmin = getRuntimeAdmin();
  const { data: existing } = await supabaseAdmin
    .from("platform_assets" as never)
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (existing) {
    const row = existing as unknown as {
      code: string;
      issuer_public: string;
      issuer_secret: string;
    };
    return {
      code: row.code,
      issuerPublic: row.issuer_public,
      issuerSecret: row.issuer_secret,
    };
  }

  console.log("CREATING NEW ISSUER", code);
  const issuer = StellarSdk.Keypair.random();
  await fundWithFriendbot(issuer.publicKey());

  const { error } = await supabaseAdmin.from("platform_assets" as never).insert({
    code,
    issuer_public: issuer.publicKey(),
    issuer_secret: issuer.secret(),
  } as never);

  if (error) {
    // Race condition possível — re-tenta leitura.
    const { data: again } = await supabaseAdmin
      .from("platform_assets" as never)
      .select("*")
      .eq("code", code)
      .maybeSingle();
    if (again) {
      const r = again as unknown as {
        code: string;
        issuer_public: string;
        issuer_secret: string;
      };
      return { code: r.code, issuerPublic: r.issuer_public, issuerSecret: r.issuer_secret };
    }
    throw error;
  }

  console.log("ISSUER CREATED", code, issuer.publicKey());
  return { code, issuerPublic: issuer.publicKey(), issuerSecret: issuer.secret() };
}

export async function getAsset(currency: string): Promise<{
  asset: StellarSdk.Asset;
  issuerSecret: string;
  code: string;
}> {
  const { code, issuerPublic, issuerSecret } = await ensureIssuer(currency);
  const cached = assetCache.get(code);
  const asset = cached ?? new StellarSdk.Asset(code, issuerPublic);
  if (!cached) assetCache.set(code, asset);
  return { asset, issuerSecret, code };
}

/** Cria keypair, financia via Friendbot e retorna a chave. */
export async function createFundedWallet(): Promise<StellarSdk.Keypair> {
  const kp = StellarSdk.Keypair.random();
  await fundWithFriendbot(kp.publicKey());
  return kp;
}

/** Estabelece trustline da `account` para o asset, assinando com `accountSecret`. */
export async function establishTrustline(
  accountSecret: string,
  asset: StellarSdk.Asset,
): Promise<void> {
  const kp = StellarSdk.Keypair.fromSecret(accountSecret);
  const acc = await server.loadAccount(kp.publicKey());
  const fee = await server.fetchBaseFee();
  const tx = new StellarSdk.TransactionBuilder(acc, {
    fee: String(fee),
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(StellarSdk.Operation.changeTrust({ asset }))
    .setTimeout(60)
    .build();
  tx.sign(kp);
  await server.submitTransaction(tx);
}

/** Envia `amount` do `asset` de `fromSecret` para `toPublic`. */
export async function sendAsset(
  fromSecret: string,
  toPublic: string,
  asset: StellarSdk.Asset,
  amount: string,
): Promise<{ hash: string; ledger: number; successful: boolean }> {
  const kp = StellarSdk.Keypair.fromSecret(fromSecret);
  const acc = await server.loadAccount(kp.publicKey());
  const fee = await server.fetchBaseFee();
  const tx = new StellarSdk.TransactionBuilder(acc, {
    fee: String(fee),
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: toPublic,
        asset,
        amount,
      }),
    )
    .setTimeout(60)
    .build();
  tx.sign(kp);
  const res = await server.submitTransaction(tx);
  return {
    hash: res.hash,
    ledger: (res as unknown as { ledger: number }).ledger,
    successful: res.successful,
  };
}

/** Formata número para precisão Stellar (máx 7 decimais, string). */
export function toStellarAmount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0.0000001";
  // Stellar suporta até 7 decimais.
  return value.toFixed(7).replace(/\.?0+$/, "") || "0.0000001";
}

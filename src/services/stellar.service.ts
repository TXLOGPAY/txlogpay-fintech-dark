import * as StellarSdk from "@stellar/stellar-sdk";

const server = new StellarSdk.Horizon.Server(
  "https://horizon-testnet.stellar.org",
);

/** Mapeamento moeda fiduciária → asset operacional interno (backend-only). */
export const OPERATIONAL_ASSET_MAP: Record<string, string> = {
  USD: "USDTX",
  EUR: "EURTX",
  BRL: "BRLTX",
  GBP: "GBPTX",
  CNY: "CNYTX",
};

export function getOperationalAsset(currency: string): string {
  return OPERATIONAL_ASSET_MAP[currency?.toUpperCase()] ?? `${currency?.toUpperCase()}TX`;
}

async function fundWithFriendbot(publicKey: string) {
  await fetch(
    `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`,
  );
}

export async function createTestnetWallet() {
  const pair = StellarSdk.Keypair.random();
  await fundWithFriendbot(pair.publicKey());
  return { publicKey: pair.publicKey(), secret: pair.secret() };
}

/**
 * Executa transferência real na Stellar Testnet entre duas wallets recém-criadas
 * (custodial source → settlement destination). On-chain usa XLM nativo (asset
 * operacional é referência interna). Retorna hash + ledger reais.
 */
export async function executeStellarSettlement(opts: { amount?: string } = {}) {
  const amount = opts.amount ?? "10";

  const source = StellarSdk.Keypair.random();
  const destination = StellarSdk.Keypair.random();

  // Funda ambas em paralelo para acelerar o settlement.
  await Promise.all([
    fundWithFriendbot(source.publicKey()),
    fundWithFriendbot(destination.publicKey()),
  ]);

  const sourceAccount = await server.loadAccount(source.publicKey());
  const fee = await server.fetchBaseFee();

  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: String(fee),
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: destination.publicKey(),
        asset: StellarSdk.Asset.native(),
        amount,
      }),
    )
    .setTimeout(30)
    .build();

  transaction.sign(source);

  const result = await server.submitTransaction(transaction);

  return {
    hash: result.hash,
    ledger: result.ledger,
    successful: result.successful,
    sourceWallet: source.publicKey(),
    destinationWallet: destination.publicKey(),
  };
}

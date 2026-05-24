import * as StellarSdk from "@stellar/stellar-sdk";

const server = new StellarSdk.Horizon.Server(
  "https://horizon-testnet.stellar.org"
);

export async function createTestnetWallet() {
  const pair = StellarSdk.Keypair.random();

  await fetch(
    `https://friendbot.stellar.org?addr=${encodeURIComponent(
      pair.publicKey()
    )}`
  );

  return {
    publicKey: pair.publicKey(),
    secret: pair.secret(),
  };
}

export async function sendTestPayment(destination: string, amount = "10") {
  const source = StellarSdk.Keypair.random();

  await fetch(
    `https://friendbot.stellar.org?addr=${encodeURIComponent(
      source.publicKey()
    )}`
  );

  const sourceAccount = await server.loadAccount(source.publicKey());

  const fee = await server.fetchBaseFee();

  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: String(fee),
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination,
        asset: StellarSdk.Asset.native(),
        amount,
      })
    )
    .setTimeout(30)
    .build();

  transaction.sign(source);

  const result = await server.submitTransaction(transaction);

  return {
    hash: result.hash,
    ledger: result.ledger,
    successful: result.successful,
  };
}
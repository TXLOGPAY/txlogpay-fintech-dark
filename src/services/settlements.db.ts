import { supabase } from "@/integrations/supabase/client";
import { executeStellarSettlement, getOperationalAsset } from "@/services/stellar.service";

export type Settlement = {
  id: string;
  operation_id: string;
  user_id: string;
  tx_hash: string;
  ledger: number | null;
  amount: number;
  asset: string;
  asset_code: string | null;
  operation_currency: string | null;
  source_wallet: string | null;
  destination_wallet: string;
  confirmation_code: string | null;
  network: string;
  status: string;
  successful: boolean;
  created_at: string;
};

function generateConfirmationCode(): string {
  // TXL-XXXXXX-XXX  (numérico + letras maiúsculas)
  const num = Math.floor(100000 + Math.random() * 900000);
  const letters = Array.from({ length: 3 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26)),
  ).join("");
  return `TXL-${num}-${letters}`;
}

export const settlementsDb = {
  async getByOperation(operationId: string): Promise<Settlement | null> {
    const { data, error } = await supabase
      .from("settlements" as never)
      .select("*")
      .eq("operation_id", operationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return null;
    return (data as unknown as Settlement) ?? null;
  },

  /**
   * Executa a liquidação internacional on-chain (Stellar Testnet) e persiste
   * o registro. A blockchain é detalhe de implementação — a UX apresenta
   * apenas como "Liquidação Internacional".
   *
   * O `currency` é a moeda fiduciária original (USD, EUR, BRL, GBP, CNY).
   * Internamente é mapeada para o asset operacional (USDTX, EURTX, …).
   */
  async createForOperation(
    operationId: string,
    userId: string,
    currency: string,
  ): Promise<Settlement> {
    const assetCode = getOperationalAsset(currency);
    const result = await executeStellarSettlement({ amount: "10" });

    const row = {
      operation_id: operationId,
      user_id: userId,
      tx_hash: result.hash,
      ledger: result.ledger ?? null,
      amount: 10,
      asset: "XLM",
      asset_code: assetCode,
      operation_currency: currency?.toUpperCase() ?? null,
      source_wallet: result.sourceWallet,
      destination_wallet: result.destinationWallet,
      confirmation_code: generateConfirmationCode(),
      network: "stellar-testnet",
      status: result.successful ? "CONFIRMED" : "FAILED",
      successful: !!result.successful,
    };

    const { data, error } = await supabase
      .from("settlements" as never)
      .insert(row as never)
      .select("*")
      .single();
    if (error) throw error;
    return data as unknown as Settlement;
  },
};

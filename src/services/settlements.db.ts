import { supabase } from "@/integrations/supabase/client";
import { createTestnetWallet, sendTestPayment } from "@/services/stellar.service";

export type Settlement = {
  id: string;
  operation_id: string;
  user_id: string;
  tx_hash: string;
  ledger: number | null;
  amount: number;
  asset: string;
  destination_wallet: string;
  network: string;
  status: string;
  successful: boolean;
  created_at: string;
};

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
   */
  async createForOperation(operationId: string, userId: string): Promise<Settlement> {
    const wallet = await createTestnetWallet();
    const amount = "10";
    const result = await sendTestPayment(wallet.publicKey, amount);

    const row = {
      operation_id: operationId,
      user_id: userId,
      tx_hash: result.hash,
      ledger: result.ledger ?? null,
      amount: Number(amount),
      asset: "XLM",
      destination_wallet: wallet.publicKey,
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

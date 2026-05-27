import { supabase } from "@/integrations/supabase/client";

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

  /** Chamadas de criação são feitas via useServerFn em useExecuteSettlement. */
  async createForOperation(operationId: string): Promise<Settlement> {
    throw new Error(`createForOperation deve ser executado via server function (${operationId}).`);
  },
};

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { operationsDb, type DBOperation } from "@/services/operations.db";
import { settlementsDb, type Settlement } from "@/services/settlements.db";
import { useAuth } from "@/hooks/use-auth";
import { createOperationWallet } from "@/lib/wallet.functions";
import { executeSettlement } from "@/lib/settlement.functions";

const KEYS = {
  all: ["operations"] as const,
  active: ["operations", "active"] as const,
  detail: (id: string) => ["operations", "detail", id] as const,
};

export function useActiveOperations() {
  const { isAuthenticated } = useAuth();
  return useQuery<DBOperation[]>({
    queryKey: KEYS.active,
    queryFn: () => operationsDb.listActive(),
    enabled: isAuthenticated,
    staleTime: 15_000,
  });
}

export function useAllOperations() {
  const { isAuthenticated } = useAuth();
  return useQuery<DBOperation[]>({
    queryKey: KEYS.all,
    queryFn: () => operationsDb.list(),
    enabled: isAuthenticated,
    staleTime: 15_000,
  });
}

export function useOperation(id: string | undefined) {
  return useQuery<DBOperation | null>({
    queryKey: KEYS.detail(id ?? ""),
    queryFn: () => (id ? operationsDb.get(id) : Promise.resolve(null)),
    enabled: !!id,
    staleTime: 5_000,
  });
}

export function useSubmitReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; url: string; name: string }) =>
      operationsDb.submitReceipt(args.id, args.url, args.name),
    onSuccess: (op) => {
      qc.invalidateQueries({ queryKey: ["operations"] });
      qc.setQueryData(KEYS.detail(op.id), op);
    },
  });
}

/**
 * Validação da garantia: marca a operação como ativa (monitoramento)
 * e cria automaticamente a wallet operacional (custódia) — invisível para o UX.
 * NÃO dispara settlement.
 */
export function useValidatePayment() {
  const qc = useQueryClient();
  const createOperationWalletFn = useServerFn(createOperationWallet);
  return useMutation({
    mutationFn: async (id: string) => {
      const op = await operationsDb.validatePayment(id);
      // Cria wallet operacional logo após validar a garantia.
      if (!op.operation_wallet) {
        try {
          const res = await createOperationWalletFn({ data: { operationId: id } });
          console.log({ operationWalletCreated: res?.publicKey });
        } catch (e) {
          // Friendbot/rede pode falhar — não bloqueia validação.
          console.warn("operation_wallet creation falhou (ignorado):", e);
        }
      }
      return op;
    },
    onSuccess: (op) => {
      qc.invalidateQueries({ queryKey: ["operations"] });
      qc.setQueryData(KEYS.detail(op.id), op);
    },
  });
}

/**
 * Executa a liquidação internacional (Stellar Testnet) para a operação.
 * Disparado automaticamente quando o evento Siscomex casa com o release_trigger.
 */
export function useExecuteSettlement() {
  const qc = useQueryClient();
  const executeSettlementFn = useServerFn(executeSettlement);
  return useMutation({
    mutationFn: async (args: { operationId: string; currency?: string }) => {
      const result = await executeSettlementFn({ data: { operationId: args.operationId } });
      return result as unknown as Settlement;
    },
    onSuccess: (settlement) => {
      qc.invalidateQueries({ queryKey: ["operations"] });
      qc.invalidateQueries({ queryKey: ["settlement", settlement.operation_id] });
    },
  });
}

export function useSettlement(operationId: string | undefined) {
  return useQuery<Settlement | null>({
    queryKey: ["settlement", operationId ?? ""],
    queryFn: () =>
      operationId ? settlementsDb.getByOperation(operationId) : Promise.resolve(null),
    enabled: !!operationId,
    refetchInterval: (q) => (q.state.data ? false : 4000),
  });
}

// Backward-compat alias
export const useMarkOperationActive = useValidatePayment;

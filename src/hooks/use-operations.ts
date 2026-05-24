import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { operationsDb, type DBOperation } from "@/services/operations.db";
import { settlementsDb, type Settlement } from "@/services/settlements.db";
import { useAuth } from "@/hooks/use-auth";

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

export function useValidatePayment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const op = await operationsDb.validatePayment(id);
      // Dispara liquidação internacional (Stellar testnet) em background — UX invisível.
      if (user?.id) {
        try {
          await settlementsDb.createForOperation(id, user.id);
        } catch (e) {
          console.error("[settlement] falhou:", e);
        }
      }
      return op;
    },
    onSuccess: (op) => {
      qc.invalidateQueries({ queryKey: ["operations"] });
      qc.invalidateQueries({ queryKey: ["settlement", op.id] });
      qc.setQueryData(KEYS.detail(op.id), op);
    },
  });
}

export function useSettlement(operationId: string | undefined) {
  return useQuery<Settlement | null>({
    queryKey: ["settlement", operationId ?? ""],
    queryFn: () => (operationId ? settlementsDb.getByOperation(operationId) : Promise.resolve(null)),
    enabled: !!operationId,
    refetchInterval: (q) => (q.state.data ? false : 4000),
  });
}

// Backward-compat alias
export const useMarkOperationActive = useValidatePayment;

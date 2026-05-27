import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { motion } from "motion/react";
import { Shield, Truck, ClipboardCheck, Building2, Plus, Inbox, Loader2 } from "lucide-react";
import { useAllOperations } from "@/hooks/use-operations";
import { formatCurrency } from "@/lib/formatters";
import { calculateProtectedTotal, fetchUsdBaseRates, getProtectedAmount, type FxRates } from "@/lib/financial-calculations";
import type { DBOperation } from "@/services/operations.db";

export const Route = createFileRoute("/operacoes/")({
  head: () => ({ meta: [{ title: "Operações — TXLOGPAY" }] }),
  component: OperacoesList,
});

import { STATUS_META, isActive } from "@/domain/operation-status";

const isSettled = (o: DBOperation) =>
  o.settlement_status === "CONFIRMED" ||
  o.status === "COMPLETED" ||
  o.status === "PAYMENT_RELEASED";

function statusLabel(o: DBOperation): { label: string; color: string } {
  if (o.settlement_status === "CONFIRMED") {
    return { label: "Liquidação concluída", color: "var(--success)" };
  }
  if (o.settlement_status === "PROCESSING") {
    return { label: "Liquidação em curso", color: "var(--secondary)" };
  }
  if (o.settlement_status === "PENDING") {
    return { label: "Aguardando liquidação", color: "var(--warning)" };
  }
  const meta = STATUS_META[o.status as keyof typeof STATUS_META];
  return meta ? { label: meta.label, color: meta.color } : { label: o.status, color: "var(--muted-foreground)" };
}

function computeKpis(ops: DBOperation[], rates: FxRates, fxTimestamp: string | null) {
  // Ativas = monitoradas e NÃO liquidadas
  const active = ops.filter(
    (o) => (o.status === "ACTIVE" || o.status === "OPERATION_MONITORING") && !isSettled(o),
  );
  const settled = ops.filter(isSettled);
  const protectedTotal = calculateProtectedTotal(active, rates, fxTimestamp);
  return { activeCount: active.length, settledCount: settled.length, protectedTotal, total: ops.length };
}

function OperacoesList() {
  const { data: ops = [], isLoading, error } = useAllOperations();
  const { data: fx } = useQuery({ queryKey: ["fx", "usd-base-rates"], queryFn: fetchUsdBaseRates, staleTime: 5 * 60 * 1000 });
  const k = computeKpis(ops, fx?.rates ?? { USD: 1 }, fx?.fxTimestamp ?? null);
  const fxTooltip = "Valores convertidos para USD com referência cambial em tempo real.";

  const KPIS = [
    { icon: Truck, label: "Operações Ativas", value: String(k.activeCount), chip: k.activeCount > 0 ? "Em monitoramento" : "Nenhuma", chipClass: "chip-info", tooltip: undefined },
    { icon: Shield, label: "Pagamentos Protegidos", value: formatCurrency(k.protectedTotal.amount, k.protectedTotal.currency), chip: "Garantia ativa", chipClass: "chip-info", highlight: true, tooltip: k.protectedTotal.isConverted ? fxTooltip : undefined },
    { icon: ClipboardCheck, label: "Total de Operações", value: String(k.total), chip: "Histórico", chipClass: "chip-info", tooltip: undefined },
    { icon: Building2, label: "Operações Concluídas", value: String(k.settledCount), chip: "Finalizadas", chipClass: "chip-success", tooltip: undefined },
  ];

  return (
    <AppShell>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Operações Internacionais</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl">
            Gerenciamento do fluxo logístico e liquidação financeira em tempo real.
          </p>
        </div>
        <Link to="/operacoes/conectar" className="btn-primary rounded-xl px-5 py-3 text-sm font-semibold flex items-center gap-2">
          <Plus className="h-4 w-4" /> Nova Operação
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {KPIS.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className={"card-surface p-6 " + (k.highlight ? "ring-1 ring-secondary/30" : "")} title={k.tooltip}>
            <div className="flex justify-between items-start">
              <k.icon className="h-5 w-5 text-secondary" />
              <span className={"chip " + k.chipClass + " text-[10px]"}>{k.chip}</span>
            </div>
            <div className="mt-6 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{k.label}</div>
            <div className="mt-2 text-3xl font-bold">{k.value}</div>
          </motion.div>
        ))}
      </div>

      <div className="card-surface mt-6 p-6">
        <h2 className="text-xl font-semibold mb-5">Operações Monitoradas</h2>

        {isLoading ? (
          <div className="py-12 grid place-items-center">
            <Loader2 className="h-6 w-6 text-secondary animate-spin" />
          </div>
        ) : error ? (
          <div className="py-8 text-center text-sm text-destructive">Erro: {(error as Error).message}</div>
        ) : ops.length === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
                  <th className="py-3 pr-4">Código</th>
                  <th className="py-3 pr-4">Exportador</th>
                  <th className="py-3 pr-4">Destino</th>
                  <th className="py-3 pr-4">Valor</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Criada</th>
                </tr>
              </thead>
              <tbody>
                {ops.map((o) => {
                  const meta = STATUS_META[o.status as keyof typeof STATUS_META] ?? { label: o.status, color: "var(--muted-foreground)" };
                  return (
                    <tr key={o.id} className="border-b border-border/60 hover:bg-surface-container/50">
                      <td className="py-4 pr-4">
                        <Link to="/operacoes/$id" params={{ id: o.id }} className="font-mono text-secondary font-semibold hover:underline">
                          #{o.operation_code}
                        </Link>
                      </td>
                      <td className="py-4 pr-4 font-medium">{o.exporter_name || "—"}</td>
                      <td className="py-4 pr-4 text-muted-foreground">{o.beneficiary_country || "—"}</td>
                      <td className="py-4 pr-4 font-mono">{formatCurrency(getProtectedAmount(o), o.currency)}</td>
                      <td className="py-4 pr-4">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color, boxShadow: `0 0 8px ${meta.color}` }} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-4 pr-4 text-xs text-muted-foreground font-mono">
                        {new Date(o.created_at).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Empty() {
  return (
    <div className="text-center py-12">
      <div className="mx-auto h-14 w-14 rounded-2xl grid place-items-center bg-surface-container-low border border-border mb-4">
        <Inbox className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold">Você ainda não possui operações ativas</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
        Operações aguardando pagamento não aparecem aqui. Após validação do comprovante, elas serão listadas automaticamente.
      </p>
      <Link to="/operacoes/conectar" className="btn-primary inline-flex items-center gap-2 mt-5 rounded-xl px-5 py-2.5 text-sm font-semibold">
        <Plus className="h-4 w-4" /> Criar primeira operação
      </Link>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { motion } from "motion/react";
import {
  Shield, CheckCircle2, TrendingUp, Wallet, Inbox, Loader2, Clock, Sparkles, ArrowUpRight,
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, Tooltip } from "recharts";
import { useAllOperations } from "@/hooks/use-operations";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/formatters";
import { calculateFinancialTotal, calculateProtectedTotal, fetchUsdBaseRates, getProtectedAmount, getTotalFees, toUsdAmount, type FxRates } from "@/lib/financial-calculations";
import { TIER_FEES } from "@/services/fee-engine.service";
import { USER_TIER_BADGE } from "@/types/profile.types";
import type { DBOperation } from "@/services/operations.db";
import type { UserTier } from "@/domain/user";

export const Route = createFileRoute("/pagamentos")({
  head: () => ({ meta: [{ title: "Pagamentos — TXLOGPAY" }] }),
  component: Pagamentos,
});

// Comparativo institucional: cartão internacional ~ 4.5% vs TXLOGPAY ~ 1.5%
const TRADITIONAL_CARD_RATE = 0.045;
const TXLOGPAY_EFFECTIVE_RATE = 0.015;

const isSettled = (o: DBOperation) =>
  o.settlement_status === "CONFIRMED" ||
  o.status === "COMPLETED" ||
  o.status === "PAYMENT_RELEASED";

function computeFinancials(ops: DBOperation[], rates: FxRates, fxTimestamp: string | null) {
  const pending = ops.filter((o) => o.status === "PENDING_PAYMENT");
  const underReview = ops.filter((o) => o.status === "PAYMENT_UNDER_REVIEW");
  // Garantia ativa: validadas e AINDA não liquidadas
  const active = ops.filter(
    (o) => (o.status === "ACTIVE" || o.status === "OPERATION_MONITORING") && !isSettled(o),
  );
  // Liberadas: settlement_status CONFIRMED
  const completed = ops.filter(isSettled);

  const protectedActive = calculateProtectedTotal(active, rates, fxTimestamp);
  const released = calculateProtectedTotal(completed, rates, fxTimestamp);
  const transacted = calculateProtectedTotal([...active, ...completed], rates, fxTimestamp);
  const totalFees = calculateFinancialTotal(ops, getTotalFees, rates, fxTimestamp);
  // Economia = (taxa cartão internacional - taxa TXLOGPAY) sobre o volume transacionado
  const savingsAmount = Math.max(0, transacted.amount * (TRADITIONAL_CARD_RATE - TXLOGPAY_EFFECTIVE_RATE));
  const savings = { ...transacted, amount: savingsAmount };

  return { pending, underReview, active, completed, protectedActive, released, transacted, totalFees, savings };
}

function monthlySeries(ops: DBOperation[], rates: FxRates, forceUsd: boolean) {
  const buckets = new Map<string, { label: string; count: number; volume: number }>();
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    buckets.set(key, { label, count: 0, volume: 0 });
  }
  for (const o of ops) {
    const d = new Date(o.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const b = buckets.get(key);
    if (b) {
      b.count++;
      const amount = getProtectedAmount(o);
      b.volume += forceUsd ? toUsdAmount(amount, o.currency, rates) : amount;
    }
  }
  return Array.from(buckets.values());
}

function Pagamentos() {
  const { data: ops = [], isLoading, error } = useAllOperations();
  const { data: fx } = useQuery({ queryKey: ["fx", "usd-base-rates"], queryFn: fetchUsdBaseRates, staleTime: 5 * 60 * 1000 });
  const { profile } = useAuth();
  const tier: UserTier = (profile?.tier as UserTier) ?? "STANDARD";
  const tierMeta = USER_TIER_BADGE[tier];
  const f = computeFinancials(ops, fx?.rates ?? { USD: 1 }, fx?.fxTimestamp ?? null);
  const series = monthlySeries(ops, fx?.rates ?? { USD: 1 }, f.transacted.isConverted);
  const fxTooltip = "Valores convertidos para USD com referência cambial em tempo real.";

  return (
    <AppShell>
      <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">
        <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link> ›{" "}
        <span className="text-secondary">Pagamentos</span>
      </div>

      <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Pagamentos & Garantias</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão financeira consolidada das operações monitoradas. Liberação vinculada a eventos aduaneiros.
          </p>
        </div>
        <span className={"chip text-[11px] " + tierMeta.className}>Plano {tierMeta.label}</span>
      </div>

      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorView msg={(error as Error).message} />
      ) : ops.length === 0 ? (
        <Empty />
      ) : (
        <>
          {/* KPIs reais */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            <Kpi icon={Clock}        label="Aguardando depósito" value={String(f.pending.length)} hint={`${f.pending.length} aguardando pagamento`} tone="chip-warning" />
            <Kpi icon={Shield}       label="Garantia ativa"      value={formatCurrency(f.protectedActive.amount, f.protectedActive.currency)} hint={`${f.active.length} operações monitoradas`} tone="chip-info" highlight tooltip={f.protectedActive.isConverted ? fxTooltip : undefined} />
            <Kpi icon={CheckCircle2} label="Pagamentos liberados" value={formatCurrency(f.released.amount, f.released.currency)} hint={`${f.completed.length} concluídas`} tone="chip-success" tooltip={f.released.isConverted ? fxTooltip : undefined} />
            <Kpi icon={TrendingUp}   label="Economia gerada"      value={formatCurrency(f.savings.amount, f.savings.currency)} hint="vs. carta de crédito tradicional" tone="chip-cargo" tooltip={f.savings.isConverted ? fxTooltip : undefined} />
          </div>

          <div className="grid xl:grid-cols-3 gap-5 mt-6">
            {/* Listas operacionais */}
            <div className="xl:col-span-2 space-y-5">
              <PaymentBlock title="Aguardando depósito" tone="warning" ops={f.pending} empty="Nenhuma operação aguardando depósito." />
              <PaymentBlock title="Pagamentos em análise" tone="info" ops={f.underReview} empty="Nenhum comprovante aguardando validação." showReceipt />
              <PaymentBlock title="Operações monitoradas" tone="info" ops={f.active}  empty="Sem operações ativas no momento." />
              <PaymentBlock title="Pagamentos liberados" tone="success" ops={f.completed} empty="Nenhuma liquidação concluída ainda." />
            </div>

            {/* Right column: chart + comparativo + upgrade */}
            <div className="space-y-5">
              <div className="card-surface p-6">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Volume mensal</div>
                  <Wallet className="h-4 w-4 text-secondary" />
                </div>
                <div className="text-2xl font-bold mt-1 text-gradient">{formatCurrency(f.transacted.amount, f.transacted.currency)}</div>
                <div className="text-[10px] text-muted-foreground font-mono">total transacionado</div>
                <div className="h-28 mt-4">
                  <ResponsiveContainer>
                    <BarChart data={series}>
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ background: "var(--surface-container)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatCurrency(v, f.transacted.currency)} />
                      <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
                        {series.map((_, i) => (
                          <Cell key={i} fill={i === series.length - 1 ? "oklch(0.85 0.18 200)" : "oklch(0.85 0.18 200 / 0.4)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <PlanComparison currentTier={tier} />
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}

function Kpi({ icon: Icon, label, value, hint, tone, highlight, tooltip }: { icon: any; label: string; value: string; hint: string; tone: string; highlight?: boolean; tooltip?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={"card-surface p-6 " + (highlight ? "ring-1 ring-secondary/40" : "")} title={tooltip}>
      <div className="flex justify-between items-start">
        <Icon className="h-5 w-5 text-secondary" />
        <span className={"chip " + tone + " text-[10px]"}>{hint.split(" ").slice(0,2).join(" ")}</span>
      </div>
      <div className="mt-6 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
      <div className="mt-2 text-[10px] text-muted-foreground">{hint}</div>
    </motion.div>
  );
}

function PaymentBlock({ title, tone, ops, empty, showReceipt }: { title: string; tone: "warning" | "info" | "success"; ops: DBOperation[]; empty: string; showReceipt?: boolean }) {
  const dot = tone === "warning" ? "var(--warning)" : tone === "success" ? "var(--success)" : "var(--secondary)";
  return (
    <div className="card-surface p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: dot, boxShadow: `0 0 10px ${dot}` }} />
          {title}
        </h2>
        <span className="font-mono text-[10px] text-muted-foreground">{ops.length}</span>
      </div>
      {ops.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">{empty}</p>
      ) : (
        <div className="space-y-2">
          {ops.slice(0, 5).map((o) => (
            <Link key={o.id} to="/operacoes/$id/pagamento" params={{ id: o.id }}
              className="flex items-center justify-between p-3 rounded-lg glass hover:bg-surface-container transition-colors">
              <div className="min-w-0">
                <div className="font-mono text-secondary text-sm font-semibold">#{o.operation_code}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  {o.exporter_name || "—"} · {o.beneficiary_country || "—"}
                </div>
                {showReceipt && o.payment_receipt_name && (
                  <div className="text-[10px] text-secondary font-mono mt-1 truncate">
                    📎 {o.payment_receipt_name} · {o.payment_submitted_at ? new Date(o.payment_submitted_at).toLocaleDateString("pt-BR") : ""}
                  </div>
                )}
              </div>
              <div className="text-right shrink-0 ml-3">
                <div className="font-semibold text-sm">{formatCurrency(getProtectedAmount(o), o.currency)}</div>
                <div className="text-[10px] text-muted-foreground font-mono">fee {formatCurrency(Number(o.fee_amount), o.currency)}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}


function PlanComparison({ currentTier }: { currentTier: UserTier }) {
  const tiers: UserTier[] = ["STANDARD", "ENTERPRISE", "VIP"];
  return (
    <div className="card-surface p-6 relative overflow-hidden" style={{ background: "linear-gradient(160deg, oklch(0.32 0.16 230 / 0.6), oklch(0.22 0.10 270 / 0.55))" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Comparação de Planos</div>
        <Sparkles className="h-4 w-4 text-accent" />
      </div>
      <h3 className="text-lg font-semibold">Reduza sua taxa operacional</h3>
      <div className="mt-4 space-y-2">
        {tiers.map((t) => {
          const f = TIER_FEES[t];
          const total = (f.operational + f.custody + f.settlement) * 100;
          const active = t === currentTier;
          return (
            <div key={t} className={"flex items-center justify-between p-3 rounded-lg " + (active ? "bg-secondary/15 ring-1 ring-secondary/40" : "bg-surface-container-low")}>
              <div>
                <div className="text-sm font-semibold">{USER_TIER_BADGE[t].label}</div>
                <div className="text-[10px] text-muted-foreground font-mono">operacional + custódia + liquidação</div>
              </div>
              <div className="text-right">
                <div className={"font-mono text-sm font-bold " + (active ? "text-secondary" : "")}>{total.toFixed(2)}%</div>
                {active && <div className="text-[9px] text-secondary font-mono uppercase">atual</div>}
              </div>
            </div>
          );
        })}
      </div>
      {currentTier !== "ENTERPRISE" && currentTier !== "VIP" && (
        <Link to="/configuracoes" className="mt-5 w-full rounded-xl py-3 text-sm font-semibold border border-secondary/40 hover:bg-secondary/10 inline-flex items-center justify-center gap-2">
          Upgrade Enterprise <ArrowUpRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function Loading() {
  return <div className="card-surface p-16 grid place-items-center"><Loader2 className="h-6 w-6 text-secondary animate-spin" /></div>;
}
function ErrorView({ msg }: { msg: string }) {
  return <div className="card-surface p-8 text-center text-sm text-destructive">{msg}</div>;
}
function Empty() {
  return (
    <div className="card-surface p-12 text-center">
      <div className="mx-auto h-14 w-14 rounded-2xl grid place-items-center bg-surface-container-low border border-border mb-4">
        <Inbox className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold">Sem movimentações financeiras</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
        Quando você criar sua primeira operação, todas as garantias, fees e liberações aparecerão aqui em tempo real.
      </p>
      <Link to="/operacoes/conectar" className="btn-primary inline-flex items-center gap-2 mt-5 rounded-xl px-5 py-2.5 text-sm font-semibold">
        Criar primeira operação
      </Link>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { motion } from "motion/react";
import {
  Shield, Wallet, TrendingUp, History, Plus, Inbox, Loader2, Sparkles, ArrowUpRight, BarChart3, CheckCircle2, Clock,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useAllOperations } from "@/hooks/use-operations";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/formatters";
import { USER_TIER_BADGE } from "@/types/profile.types";
import type { DBOperation } from "@/services/operations.db";
import type { UserTier } from "@/domain/user";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — TXLOGPAY" }] }),
  component: Dashboard,
});

const TRADITIONAL_LC_RATE = 0.025;

function computeKpis(all: DBOperation[]) {
  const active = all.filter((o) => o.status === "ACTIVE");
  const completed = all.filter((o) => o.status === "COMPLETED");
  // KPIs executivos consideram apenas operações ATIVAS e CONCLUÍDAS
  const counted = [...active, ...completed];
  const protectedAmount = active.reduce((s, o) => s + Number(o.protected_amount || 0), 0);
  const volume = counted.reduce((s, o) => s + Number(o.protected_amount || 0), 0);
  const fees = counted.reduce((s, o) => s + Number(o.fee_amount || 0), 0);
  const traditional = counted.reduce((s, o) => s + Number(o.protected_amount || 0) * TRADITIONAL_LC_RATE, 0);
  const savings = Math.max(0, traditional - fees);
  return {
    protectedAmount, volume, savings,
    activeCount: active.length, completedCount: completed.length,
    counted,
  };
}

function monthlySeries(ops: DBOperation[]) {
  const buckets = new Map<string, { label: string; volume: number; count: number }>();
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    buckets.set(key, { label, volume: 0, count: 0 });
  }
  for (const o of ops) {
    const d = new Date(o.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const b = buckets.get(key);
    if (b) { b.volume += Number(o.protected_amount || 0); b.count++; }
  }
  return Array.from(buckets.values());
}

function Dashboard() {
  const { data: ops = [], isLoading, error } = useAllOperations();
  const { profile } = useAuth();
  const tier: UserTier = (profile?.tier as UserTier) ?? "STANDARD";
  const tierMeta = USER_TIER_BADGE[tier];

  const k = computeKpis(ops);
  const series = monthlySeries(k.counted);
  const ccy = ops[0]?.currency || "USD";
  const isNewUser = ops.length === 0;

  return (
    <AppShell topbar={
      <div className="hidden md:flex gap-6 text-xs font-mono uppercase tracking-widest">
        <span className="text-secondary">Visão Executiva</span>
      </div>
    }>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Operacional</h1>
          <p className="text-sm text-muted-foreground max-w-xl mt-1">
            Painel executivo das garantias ativas, liquidações concluídas e impacto financeiro consolidado.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={"chip text-[11px] " + tierMeta.className}>Plano {tierMeta.label}</span>
          <Link to="/operacoes/conectar" className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2">
            <Plus className="h-4 w-4" /> Nova Operação
          </Link>
        </div>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={(error as Error).message} />
      ) : isNewUser ? (
        <Onboarding />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            <Kpi icon={Shield}      label="Total Protegido"     value={formatCurrency(k.protectedAmount, ccy)} chip="Garantia ativa" chipClass="chip-cargo" featured />
            <Kpi icon={Wallet}      label="Volume Financeiro"   value={formatCurrency(k.volume, ccy)}          chip={`${k.counted.length} operações`} chipClass="chip-info" />
            <Kpi icon={TrendingUp}  label="Economia Acumulada"  value={formatCurrency(k.savings, ccy)}         chip="vs. carta de crédito" chipClass="chip-success" />
            <Kpi icon={CheckCircle2} label="Operações Concluídas" value={String(k.completedCount)}             chip={`${k.activeCount} ativas`} chipClass="chip-info" />
          </div>

          <div className="grid xl:grid-cols-3 gap-5 mt-5">
            {/* Chart */}
            <div className="card-surface p-6 xl:col-span-2">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-secondary" /> Operações por mês
                </h2>
                <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Últimos 6 meses</span>
              </div>
              <div className="h-64">
                <ResponsiveContainer>
                  <AreaChart data={series}>
                    <defs>
                      <linearGradient id="vol" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="oklch(0.85 0.18 200)" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="oklch(0.85 0.18 200)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                    <Tooltip contentStyle={{ background: "var(--surface-container)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatCurrency(v, ccy)} labelFormatter={(l) => `Mês: ${l}`} />
                    <Area type="monotone" dataKey="volume" stroke="oklch(0.85 0.18 200)" strokeWidth={2} fill="url(#vol)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Plan / Upgrade */}
            <PlanCard tier={tier} />
          </div>

          <div className="grid xl:grid-cols-3 gap-5 mt-5">
            <div className="card-surface p-6 xl:col-span-2 min-h-[280px]">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <History className="h-4 w-4 text-secondary" /> Operações Recentes
                </h2>
                <Link to="/operacoes" className="text-xs font-mono uppercase tracking-widest text-secondary hover:underline">Ver todas</Link>
              </div>
              {k.counted.length === 0 ? (
                <EmptyRecent />
              ) : (
                <div className="space-y-3">
                  {k.counted.slice(0, 5).map((o) => (
                    <Link key={o.id} to="/operacoes/$id" params={{ id: o.id }}
                      className="flex items-center justify-between p-4 rounded-xl glass hover:bg-surface-container transition-colors">
                      <div>
                        <div className="font-mono text-secondary font-semibold text-sm">#{o.operation_code}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{o.exporter_name || "—"} · {o.beneficiary_country || "—"}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(Number(o.protected_amount), o.currency)}</div>
                        <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-0.5">{o.status}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="card-surface p-6">
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-4">
                <Shield className="h-4 w-4 text-secondary" /> Resumo Financeiro
              </h2>
              <div className="space-y-4 text-sm">
                <Row label="Total protegido"    value={formatCurrency(k.protectedAmount, ccy)} highlight />
                <Row label="Volume transacionado" value={formatCurrency(k.volume, ccy)} />
                <Row label="Fees pagos"          value={formatCurrency(k.counted.reduce((s, o) => s + Number(o.fee_amount || 0), 0), ccy)} />
                <Row label="Economia gerada"     value={formatCurrency(k.savings, ccy)} />
                <div className="h-px bg-border my-2" />
                <Row label="Ativas"    value={String(k.activeCount)} />
                <Row label="Concluídas" value={String(k.completedCount)} />
              </div>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}

function Kpi({ icon: Icon, label, value, chip, chipClass, featured }: { icon: any; label: string; value: string; chip: string; chipClass: string; featured?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className={"card-surface p-6 " + (featured ? "relative overflow-hidden" : "")}
      style={featured ? { background: "linear-gradient(135deg, oklch(0.26 0.10 265 / 0.9), oklch(0.28 0.16 320 / 0.7))" } : undefined}
    >
      <div className="flex justify-between items-start">
        <Icon className="h-5 w-5 text-secondary" />
        <span className={"chip " + chipClass + " text-[10px]"}>{chip}</span>
      </div>
      <div className="mt-8 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-bold text-gradient">{value}</div>
    </motion.div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className={"font-mono " + (highlight ? "text-secondary font-bold text-base" : "text-foreground font-semibold")}>{value}</span>
    </div>
  );
}

function PlanCard({ tier }: { tier: UserTier }) {
  const meta = USER_TIER_BADGE[tier];
  const isStandard = tier === "STANDARD";
  return (
    <div className="card-surface p-6 relative overflow-hidden" style={{ background: "linear-gradient(160deg, oklch(0.32 0.16 230 / 0.6), oklch(0.22 0.10 270 / 0.55))" }}>
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Plano contratado</div>
        <Sparkles className="h-4 w-4 text-accent" />
      </div>
      <div className="mt-3 text-2xl font-bold">{meta.label}</div>
      <p className="text-xs text-muted-foreground mt-2">
        {isStandard
          ? "Você está no plano inicial. Upgrade para Enterprise reduz fees em até 50% e libera SLAs prioritários."
          : "Você possui condições preferenciais de fee, custódia e liquidação."}
      </p>
      <div className="mt-5 space-y-2 text-xs">
        <PlanRow label="Garantia operacional" ok />
        <PlanRow label="Liberação programada por evento" ok />
        <PlanRow label="Monitoramento operacional avançado" ok={tier !== "STANDARD"} />
        <PlanRow label="SLA dedicado" ok={tier === "VIP" || tier === "ANCHOR_PARTNER"} />
      </div>
      {isStandard && (
        <Link to="/configuracoes" className="mt-5 w-full rounded-xl py-2.5 text-sm font-semibold border border-secondary/40 hover:bg-secondary/10 inline-flex items-center justify-center gap-2">
          Solicitar upgrade Enterprise <ArrowUpRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function PlanRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className={ok ? "text-success font-mono" : "text-muted-foreground/60 font-mono"}>{ok ? "incluso" : "—"}</span>
    </div>
  );
}

function Onboarding() {
  return (
    <div className="card-surface p-10 relative overflow-hidden">
      <div className="grid lg:grid-cols-2 gap-8 items-center">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-secondary">Bem-vindo à TXLOGPAY</div>
          <h2 className="text-2xl font-bold mt-2">Crie sua primeira operação internacional</h2>
          <p className="text-sm text-muted-foreground mt-3 max-w-md">
            Registre uma operação previamente cadastrada no Siscomex. A TXLOGPAY assume o monitoramento operacional,
            a garantia financeira e a liquidação automática vinculada aos eventos aduaneiros.
          </p>
          <Link to="/operacoes/conectar" className="btn-primary inline-flex items-center gap-2 mt-6 rounded-xl px-6 py-3 text-sm font-semibold">
            <Plus className="h-4 w-4" /> Criar primeira operação
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Step n="1" title="Cadastre a operação"  desc="Dados Siscomex, exportador, fluxo logístico." />
          <Step n="2" title="Deposite a garantia"   desc="Valor protegido + fee operacional TXLOGPAY." />
          <Step n="3" title="Monitore o trânsito"   desc="Eventos aduaneiros disparam o gatilho de liberação." />
          <Step n="4" title="Liquidação automática" desc="Pagamento ao exportador na confirmação do evento." />
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="rounded-xl p-4 glass">
      <div className="font-mono text-secondary text-xs">PASSO {n}</div>
      <div className="font-semibold text-sm mt-1">{title}</div>
      <div className="text-xs text-muted-foreground mt-1">{desc}</div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="card-surface p-12 grid place-items-center">
      <Loader2 className="h-6 w-6 text-secondary animate-spin" />
      <p className="mt-3 text-xs font-mono uppercase tracking-widest text-muted-foreground">Carregando dados</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="card-surface p-8 text-center">
      <p className="text-sm text-destructive">Erro ao carregar operações</p>
      <p className="text-xs text-muted-foreground mt-1 font-mono">{message}</p>
    </div>
  );
}

function EmptyRecent() {
  return (
    <div className="text-center py-10">
      <div className="mx-auto h-14 w-14 rounded-2xl grid place-items-center bg-surface-container-low border border-border mb-4">
        <Clock className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold">Aguardando ativação</h3>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
        Suas operações aparecem aqui após a validação do depósito.
      </p>
    </div>
  );
}

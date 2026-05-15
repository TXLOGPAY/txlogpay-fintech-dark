import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { motion } from "motion/react";
import {
  Shield, Network, Wallet, TrendingUp, Globe, Clock, History, PiggyBank, Hourglass, RefreshCcw, Download, Plus,
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — TXLOGPAY" }] }),
  component: Dashboard,
});

const KPIS = [
  { icon: Shield, label: "Garantias Ativas", value: "USD 4.8M", chip: "+12.4%", chipClass: "chip-success" },
  { icon: Network, label: "Operações Monitoradas", value: "128", chip: "Estável", chipClass: "chip-info" },
  { icon: Wallet, label: "Pagamentos Liberados", value: "USD 12.4M", chip: "+2.1M Hoje", chipClass: "chip-success" },
  { icon: TrendingUp, label: "Economia Operacional Acumulada", value: "USD 482K", chip: "Proteção Ativa", chipClass: "chip-cargo", featured: true },
];

const ACTIVITY = [
  { t: "Pagamento liberado · TX-8829", s: "14:32 — Operação de importação finalizada via smart contract.", color: "var(--secondary)" },
  { t: "Evento aduaneiro confirmado", s: "14:31 — Desembaraço processado. Canal Verde.", color: "var(--muted-foreground)" },
  { t: "Garantia operacional ativada", s: "14:28 — Nova operação registrada (TX-9901).", color: "var(--accent)" },
  { t: "Monitoramento iniciado", s: "13:45 — Embarque confirmado em Miami (EUA).", color: "var(--muted-foreground)" },
];

function Dashboard() {
  return (
    <AppShell topbar={
      <div className="hidden md:flex gap-6 text-xs font-mono uppercase tracking-widest">
        <span className="text-secondary">Visão Geral</span>
        <span className="text-muted-foreground">Relatórios</span>
        <span className="text-muted-foreground">Alertas</span>
      </div>
    }>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Operacional</h1>
          <p className="text-sm text-muted-foreground max-w-xl mt-1">
            Monitoramento em tempo real das garantias e liberações de pagamento vinculadas a eventos aduaneiros.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="rounded-xl px-4 py-2.5 text-sm border border-border hover:bg-surface-container flex items-center gap-2"><Download className="h-4 w-4" />Exportar PDF</button>
          <Link to="/operacoes/conectar" className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2">
            <Plus className="h-4 w-4" /> Liberar Pagamento
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {KPIS.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={"card-surface p-6 " + (k.featured ? "relative overflow-hidden" : "")}
            style={k.featured ? { background: "linear-gradient(135deg, oklch(0.26 0.10 265 / 0.9), oklch(0.28 0.16 320 / 0.7))" } : undefined}
          >
            <div className="flex justify-between items-start">
              <k.icon className="h-5 w-5 text-secondary" />
              <span className={"chip " + k.chipClass + " text-[10px]"}>{k.chip}</span>
            </div>
            <div className="mt-8 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{k.label}</div>
            <div className="mt-2 text-3xl font-bold text-gradient">{k.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Map + Activity */}
      <div className="grid xl:grid-cols-3 gap-5 mt-5">
        <div className="card-surface p-6 xl:col-span-2 relative overflow-hidden min-h-[420px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest">
              <Globe className="h-4 w-4 text-secondary" /> Fluxo Operacional Global
            </div>
            <div className="flex gap-3 text-[10px] font-mono">
              <span className="chip chip-success"><span className="pulse-dot before:inline-block before:mr-1.5"></span>LIVE</span>
              <span className="chip chip-info">Latência: 0.4s</span>
            </div>
          </div>
          <div className="relative mt-6 h-[260px] rounded-xl overflow-hidden grid place-items-center"
            style={{ background: "radial-gradient(circle at 50% 50%, oklch(0.30 0.14 265 / 0.6), transparent 60%)" }}>
            <Globe className="h-48 w-48 text-secondary/30 stroke-[0.5]" />
            <div className="absolute inset-0 grid place-items-center">
              <div className="h-3 w-3 rounded-full bg-secondary animate-ping" />
            </div>
          </div>
          <div className="mt-5 grid md:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl glass border-l-2 border-secondary">
              <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest"><span className="text-muted-foreground">Em trânsito</span><span className="text-secondary">ETA: 4 dias</span></div>
              <div className="mt-1 font-semibold">China (CNSGH) → Santos (BRSSZ)</div>
              <div className="text-xs text-muted-foreground mt-1">Proteção TXLOG: 100%</div>
            </div>
            <div className="p-4 rounded-xl glass border-l-2 border-accent">
              <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest"><span className="text-muted-foreground">Liberação pendente</span><span className="text-accent">Aguardando pagamento</span></div>
              <div className="mt-1 font-semibold">Alemanha (DEHAM) → Itajaí (BRITA)</div>
              <div className="text-xs text-muted-foreground mt-1">Ajuste cambial: ativo</div>
            </div>
          </div>
        </div>

        <div className="card-surface p-6">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest"><History className="h-4 w-4 text-secondary" /> Atividade Recente</div>
          <div className="mt-5 space-y-5">
            {ACTIVITY.map((a, i) => (
              <div key={i} className="flex gap-3">
                <div className="mt-1.5 h-2 w-2 rounded-full shrink-0" style={{ background: a.color, boxShadow: `0 0 12px ${a.color}` }} />
                <div>
                  <div className="text-sm font-semibold">{a.t}</div>
                  <div className="text-xs text-muted-foreground">{a.s}</div>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 text-xs font-mono uppercase tracking-widest text-secondary hover:underline">Ver histórico completo</button>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid xl:grid-cols-3 gap-5 mt-5">
        <div className="grid grid-cols-3 gap-5 xl:col-span-2">
          {[
            { label: "Canal Verde", value: "84", color: "var(--success)" },
            { label: "Canal Amarelo", value: "12", color: "var(--warning)" },
            { label: "Em Análise", value: "18", color: "var(--accent)" },
          ].map(c => (
            <div key={c.label} className="card-surface p-5 border-l-2" style={{ borderLeftColor: c.color }}>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{c.label}</div>
              <div className="flex items-baseline gap-2 mt-2"><span className="text-2xl font-bold">{c.value}</span><span className="text-[10px] font-mono text-muted-foreground">OPS</span></div>
            </div>
          ))}
          <div className="card-surface p-5 col-span-3 md:col-span-1 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl grid place-items-center" style={{ background: "color-mix(in oklab, var(--accent) 18%, transparent)" }}>
              <Shield className="h-5 w-5 text-accent" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Garantias Ativas</div>
              <div className="font-semibold mt-0.5">42 Apólices Vinculadas</div>
              <div className="text-[10px] font-mono text-muted-foreground mt-0.5">Proteção operacional 24/7</div>
            </div>
          </div>
          <div className="card-surface p-5 col-span-3 md:col-span-2 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl grid place-items-center" style={{ background: "color-mix(in oklab, var(--secondary) 18%, transparent)" }}>
              <Hourglass className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Pagamentos Pendentes</div>
              <div className="font-semibold mt-0.5">USD 2.4M Reservados</div>
              <div className="text-[10px] font-mono text-muted-foreground mt-0.5">Aguardando evento aduaneiro</div>
            </div>
          </div>
        </div>

        <div className="card-surface p-6">
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Eficiência Financeira</div>
          <div className="mt-4">
            <div className="flex justify-between text-sm"><span>Economia Mensal</span><span className="text-secondary font-semibold">USD 92.400,00</span></div>
            <div className="mt-2 h-1.5 rounded-full bg-surface-container-low overflow-hidden">
              <div className="h-full rounded-full" style={{ width: "78%", background: "var(--gradient-brand)" }} />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">Redução direta em custos de floating e spread cambial.</p>
          </div>
          <div className="mt-6 p-4 rounded-xl glass space-y-3 text-xs">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Benchmark: TXLOGPAY vs Carta de Crédito</div>
            <div className="flex justify-between"><span>Tempo de liberação</span><div className="flex gap-2"><span className="chip chip-warning text-[9px]">LC: 15 dias</span><span className="chip chip-info text-[9px]">TX: 0.4s</span></div></div>
            <div className="flex justify-between"><span>Custo financeiro (%)</span><div className="flex gap-2"><span className="chip chip-warning text-[9px]">LC: 3.5%</span><span className="chip chip-info text-[9px]">TX: 0.8%</span></div></div>
          </div>
          <div className="mt-5 pt-5 border-t border-border flex justify-between items-center">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"><RefreshCcw className="h-3 w-3" />Taxas Processadas (MTD)</div>
            <div className="font-semibold">USD 14.280,00</div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

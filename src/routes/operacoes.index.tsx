import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { motion } from "motion/react";
import { Shield, Truck, ClipboardCheck, Building2, Plus, Download, Filter } from "lucide-react";

export const Route = createFileRoute("/operacoes/")({
  head: () => ({ meta: [{ title: "Operações — TXLOGPAY" }] }),
  component: OperacoesList,
});

const KPIS = [
  { icon: Truck, label: "Operações Ativas", value: "12", chip: "+2 hoje", chipClass: "chip-info" },
  { icon: Shield, label: "Pagamentos Protegidos", value: "$1.2M", chip: "Cargo-Linked", chipClass: "chip-cargo", highlight: true },
  { icon: ClipboardCheck, label: "Em Análise Alfandegária", value: "4", chip: "3 em Canal Amarelo", chipClass: "chip-warning" },
  { icon: Building2, label: "Liquidações Concluídas", value: "48", chip: "Últimos 30 dias", chipClass: "chip-info" },
];

const ROWS = [
  { id: "TX-8829", time: "2 min atrás", imp: "LogiCorp S.A.", origin: "China (Ningbo)", canal: "Verde", status: "Desembaraçada", statusColor: "var(--success)", pay: "Liberado Automaticamente", payClass: "text-secondary", active: true },
  { id: "TX-8825", time: "15 min atrás", imp: "Importadora Sul Ltda", origin: "Alemanha (Hamburg)", canal: "Laranja", status: "Em análise", statusColor: "var(--warning)", pay: "Protegido", payClass: "text-accent" },
  { id: "TX-8822", time: "45 min atrás", imp: "Global Tech Brasil", origin: "EUA (Miami)", canal: "Cinza", status: "Em trânsito", statusColor: "var(--muted-foreground)", pay: "Protegido", payClass: "text-accent" },
  { id: "TX-8819", time: "1 hora atrás", imp: "BioVita Labs", origin: "Índia (Mumbai)", canal: "Verde", status: "Divergência documental", statusColor: "var(--destructive)", pay: "Pendente Liberação", payClass: "text-warning" },
  { id: "TX-8810", time: "3 horas atrás", imp: "Café Brasil Export", origin: "Vietnã (Ho Chi Minh)", canal: "Verde", status: "Desembaraçada", statusColor: "var(--success)", pay: "Liberado Automaticamente", payClass: "text-secondary" },
];

const canalChip = (c: string) =>
  c === "Verde" ? "chip-success" : c === "Laranja" ? "chip-warning" : c === "Cinza" ? "chip-info" : "chip-info";

function OperacoesList() {
  return (
    <AppShell>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-secondary">
            <span className="pulse-dot before:inline-block before:mr-2"></span>
            Monitoramento em Tempo Real · Siscomex Monitor
          </div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-1">
            Última sincronização: há 12 segundos
          </div>
          <h1 className="text-3xl font-bold mt-3">Operações Internacionais</h1>
          <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mt-1">Monitoramento contínuo de eventos aduaneiros e liquidação financeira</p>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl">Gerenciamento de fluxo logístico e liquidação financeira em tempo real.</p>
        </div>
        <Link to="/operacoes/conectar" className="btn-primary rounded-xl px-5 py-3 text-sm font-semibold flex items-center gap-2">
          <Plus className="h-4 w-4" /> Criar Operação Internacional
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {KPIS.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className={"card-surface p-6 " + (k.highlight ? "ring-1 ring-secondary/40 shadow-[0_0_30px_oklch(0.85_0.18_200/0.18)]" : "")}>
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
        <div className="flex flex-wrap justify-between items-center gap-3">
          <h2 className="text-xl font-semibold">Operações Monitoradas</h2>
          <div className="flex gap-2">
            <button className="rounded-lg px-4 py-2 text-sm border border-border hover:bg-surface-container flex items-center gap-2"><Download className="h-4 w-4" />Exportar CSV</button>
            <button className="rounded-lg px-4 py-2 text-sm border border-border hover:bg-surface-container flex items-center gap-2"><Filter className="h-4 w-4" />Filtros</button>
          </div>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
                <th className="py-3 pr-4">ID</th>
                <th className="py-3 pr-4">Importador</th>
                <th className="py-3 pr-4">Origem</th>
                <th className="py-3 pr-4">Canal</th>
                <th className="py-3 pr-4">Status da Carga</th>
                <th className="py-3 pr-4">Pagamento</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(r => (
                <tr key={r.id} className={"border-b border-border/60 " + (r.active ? "bg-secondary/5 border-l-2 border-l-secondary" : "")}>
                  <td className="py-4 pr-4">
                    <Link to="/operacoes/$id" params={{ id: r.id }} className="font-mono text-secondary font-semibold hover:underline">#{r.id}</Link>
                    <div className="text-[10px] text-muted-foreground font-mono">{r.time}</div>
                  </td>
                  <td className="py-4 pr-4 font-medium">{r.imp}</td>
                  <td className="py-4 pr-4 text-muted-foreground">{r.origin}</td>
                  <td className="py-4 pr-4"><span className={"chip " + canalChip(r.canal) + " text-[10px]"}>Canal {r.canal}</span></td>
                  <td className="py-4 pr-4"><span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full" style={{ background: r.statusColor, boxShadow: `0 0 8px ${r.statusColor}` }} />{r.status}</span></td>
                  <td className={"py-4 pr-4 font-semibold " + r.payClass}>{r.pay}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

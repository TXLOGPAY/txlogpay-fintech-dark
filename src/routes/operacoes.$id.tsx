import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { motion } from "motion/react";
import { CheckCircle2, Shield, Zap, FileText, Clock, Loader2 } from "lucide-react";
import { useOperation } from "@/hooks/use-operations";
import { formatCurrency } from "@/lib/formatters";
import { STATUS_META, isActive, isPending, isUnderReview } from "@/domain/operation-status";

export const Route = createFileRoute("/operacoes/$id")({
  head: ({ params }) => ({ meta: [{ title: `Operação ${params.id} — TXLOGPAY` }] }),
  component: OperacaoDetail,
});

function OperacaoDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: op, isLoading, error } = useOperation(id);

  useEffect(() => {
    if (op && (isPending(op.status) || isUnderReview(op.status))) {
      navigate({ to: "/operacoes/$id/pagamento", params: { id }, replace: true });
    }
  }, [op?.status, id, navigate]);

  if (isLoading) {
    return <AppShell><div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 text-secondary animate-spin" /></div></AppShell>;
  }
  if (error || !op) {
    return (
      <AppShell>
        <div className="card-surface p-10 text-center">
          <p className="text-destructive">Operação não encontrada</p>
          <Link to="/operacoes" className="btn-primary inline-flex mt-4 rounded-xl px-5 py-2.5 text-sm font-semibold">Voltar</Link>
        </div>
      </AppShell>
    );
  }

  const meta = STATUS_META[op.status] ?? { label: op.status, chip: "chip-info" };

  return (
    <AppShell>
      <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">
        <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link> ›{" "}
        <Link to="/operacoes" className="hover:text-foreground">Operações</Link> ›{" "}
        <span className="text-secondary">{op.operation_code}</span>
      </div>

      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Operação #{op.operation_code}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {op.exporter_name || "—"} · {op.beneficiary_country || "—"}
          </p>
        </div>
        <span className={"chip text-[11px] " + meta.chip}>{meta.label}</span>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-surface p-7 ring-1 ring-secondary/30">
        <div className="flex items-start gap-4">
          {op.status === "COMPLETED" || op.status === "PAYMENT_RELEASED" ? (
            <CheckCircle2 className="h-10 w-10 text-success shrink-0" />
          ) : isActive(op.status) ? (
            <Shield className="h-10 w-10 text-secondary shrink-0" />
          ) : (
            <Clock className="h-10 w-10 text-warning shrink-0" />
          )}
          <div>
            <h2 className="text-xl font-semibold">{meta.label}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Status atualizado em {new Date(op.updated_at).toLocaleString("pt-BR")}
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <Info label="Valor protegido" value={formatCurrency(Number(op.protected_amount), op.currency)} />
        <Info label="Taxa TXLOGPAY" value={formatCurrency(Number(op.fee_amount), op.currency)} />
        <Info label="Total pago" value={formatCurrency(Number(op.total_amount), op.currency)} highlight />
        <Info label="Incoterm" value={op.incoterm || "—"} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mt-5">
        <div className="card-surface p-6">
          <h3 className="text-lg font-semibold mb-4">Beneficiário</h3>
          <div className="space-y-3 text-sm">
            <KV k="Exportador" v={op.exporter_name || "—"} />
            <KV k="Banco" v={op.bank_name || "—"} />
            <KV k="SWIFT" v={op.swift || "—"} mono />
            <KV k="IBAN" v={op.iban || "—"} mono />
            <KV k="País / Cidade" v={`${op.beneficiary_country || "—"} · ${op.beneficiary_city || "—"}`} />
          </div>
        </div>

        <div className="card-surface p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><FileText className="h-4 w-4 text-secondary" /> Documentação</h3>
          <div className="space-y-3 text-sm">
            <KV k="Invoice" v={op.invoice_number || "—"} mono />
            <KV k="BL / AWB" v={op.bl_awb || "—"} mono />
            <KV k="DUIMP" v={op.duimp || "—"} mono />
            <KV k="Referência Siscomex" v={op.siscomex_reference || "—"} mono />
          </div>
        </div>
      </div>

      <div className="card-surface p-6 mt-5">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Zap className="h-4 w-4 text-secondary" /> Timeline</h3>
        <ol className="relative border-l border-border ml-3 space-y-4">
          <TimelineItem date={op.created_at} title="Operação registrada" desc="Rascunho operacional criado." />
          <TimelineItem date={op.created_at} title="Pagamento solicitado" desc="Comprovante aguardando upload e validação." />
          {op.activated_at && (
            <TimelineItem date={op.activated_at} title="Pagamento validado" desc="Operação ativada — entrou em monitoramento." accent />
          )}
          {op.status === "COMPLETED" && (
            <TimelineItem date={op.updated_at} title="Liquidação concluída" desc="Pagamento liberado ao exportador." accent />
          )}
        </ol>
      </div>
    </AppShell>
  );
}

function Info({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="card-surface p-5">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={"font-semibold mt-1 " + (highlight ? "text-secondary text-lg font-mono" : "")}>{value}</div>
    </div>
  );
}

function KV({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className={mono ? "font-mono" : ""}>{v}</span>
    </div>
  );
}

function TimelineItem({ date, title, desc, accent }: { date: string; title: string; desc: string; accent?: boolean }) {
  return (
    <li className="pl-5 relative">
      <span className={"absolute -left-[6px] top-1.5 h-3 w-3 rounded-full ring-2 ring-background " + (accent ? "bg-secondary shadow-[0_0_8px_oklch(0.66_0.11_235/0.45)]" : "bg-muted-foreground")} />
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
      <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{new Date(date).toLocaleString("pt-BR")}</div>
    </li>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { motion } from "motion/react";
import {
  CheckCircle2, Shield, Zap, FileText, Clock, Loader2,
  Upload, FileCheck2, X, ExternalLink, Sparkles, AlertTriangle,
  PackageCheck, Banknote, Truck, Landmark, Globe, ArrowRight, Radio, PlayCircle,
  Receipt, Building2, ShieldCheck, Wallet,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { createOperationWallet } from "@/lib/wallet.functions";
import { toast } from "sonner";


// ---------------------------------------------------------------------------
// SISCOMEX — Enum operacional (persistido) × Label visual (UI).
// A automação compara EXCLUSIVAMENTE enums. A UI lê via mapper visual.
// ---------------------------------------------------------------------------
const SISCOMEX_VISUAL_LABELS = {
  CREATED:           "Operação criada",
  EXPORTER_ACCEPTED: "Exportador confirmou a operação",
  CARGO_SHIPPED:     "Carga embarcada pelo exportador",
  IN_TRANSIT:        "Transporte internacional em andamento",
  CUSTOMS_ARRIVAL:   "Carga recebida na alfândega",
  CUSTOMS_RELEASED:  "Desembaraço aduaneiro concluído",
} as const;
type SiscomexKey = keyof typeof SISCOMEX_VISUAL_LABELS;
const SISCOMEX_SEQUENCE: ReadonlyArray<{ key: SiscomexKey; label: string }> =
  (Object.keys(SISCOMEX_VISUAL_LABELS) as SiscomexKey[])
    .map((key) => ({ key, label: SISCOMEX_VISUAL_LABELS[key] }));
import {
  useOperation, useSubmitReceipt, useValidatePayment, useSettlement, useExecuteSettlement,
} from "@/hooks/use-operations";
import type { Settlement } from "@/services/settlements.db";
import { operationsDb, type DBOperation } from "@/services/operations.db";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/formatters";
import { getProtectedAmount } from "@/lib/financial-calculations";
import {
  STATUS_META, isActive, isPending, isUnderReview,
} from "@/domain/operation-status";

export const Route = createFileRoute("/operacoes/$id")({
  head: ({ params }) => ({ meta: [{ title: `Operação ${params.id} — TXLOGPAY` }] }),
  component: OperacaoDetail,
});

function OperacaoDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { data: op, isLoading, error } = useOperation(id);
  const { data: settlement } = useSettlement(id);
  const submitReceipt = useSubmitReceipt();
  const validate = useValidatePayment();
  const executeSettlement = useExecuteSettlement();
  const qc = useQueryClient();

  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (op?.payment_receipt_url) {
      operationsDb.getReceiptUrl(op.payment_receipt_url).then(setSignedUrl);
    }
  }, [op?.payment_receipt_url]);

  // ---------- SISCOMEX operational status — persistido em operations.current_operational_status ----------
  // Esse campo é o STATUS OPERACIONAL SISCOMEX, separado de `operations.status` (macro).
  const currentOperationalStatus =
    (op?.current_operational_status as SiscomexKey | null | undefined) ?? null;
  const siscomexIdx = currentOperationalStatus
    ? SISCOMEX_SEQUENCE.findIndex((s) => s.key === currentOperationalStatus)
    : -1;
  const currentSiscomex = siscomexIdx >= 0 ? SISCOMEX_SEQUENCE[siscomexIdx] : null;
  const [advancing, setAdvancing] = useState(false);

  // ---------- DEBUG: teste isolado da engine Stellar Testnet ----------
  const createWalletFn = useServerFn(createOperationWallet);
  const [walletDebugLoading, setWalletDebugLoading] = useState(false);
  async function handleTestStellarWallet() {
    console.log("TEST BUTTON CLICKED", { id });
    toast.info("Teste iniciado", { description: `operationId: ${id ?? "(vazio)"}` });
    if (!id) {
      toast.error("operationId ausente — handler abortado");
      return;
    }
    setWalletDebugLoading(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const testValue = `TEST_${Date.now()}`;
      const { data, error } = await supabase
        .from("operations")
        .update({ operation_wallet: testValue })
        .eq("id", id)
        .select("id, operation_wallet")
        .single();
      if (error) {
        toast.error("Falha no update Supabase", { description: error.message });
        return;
      }
      toast.success("Teste Supabase concluído", {
        description: `operation_wallet = ${data?.operation_wallet}`,
        duration: 12000,
      });
    } catch (e) {
      toast.error("Exception no handler", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setWalletDebugLoading(false);
    }
  }

  async function advanceSiscomex() {
    if (!id || advancing) return;
    if (siscomexIdx >= SISCOMEX_SEQUENCE.length - 1) return;
    const next = SISCOMEX_SEQUENCE[siscomexIdx + 1];
    setAdvancing(true);
    try {
      await operationsDb.update(id, { current_operational_status: next.key });
      qc.invalidateQueries({ queryKey: ["operations", "detail", id] });
      qc.invalidateQueries({ queryKey: ["operations"] });
    } catch (e) {
      toast.error("Falha ao avançar evento SISCOMEX", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setAdvancing(false);
    }
  }

  // Gatilho automático — compara o ENUM operacional SISCOMEX com o release_trigger.
  // NÃO compara com `operations.status` (macro).
  useEffect(() => {
    if (!op) return;
    const operation_status = op.status;
    const operational_status = currentSiscomex?.key ?? null;
    const release_trigger = (op.release_trigger || "").toUpperCase();
    const matched =
      !!operational_status && !!release_trigger && operational_status === release_trigger;
    // eslint-disable-next-line no-console
    console.log({ operation_status, operational_status, release_trigger, matched });
    if (!matched) return;
    if (settlement || executeSettlement.isPending) return;
    if (!isActive(op.status)) return;
    executeSettlement
      .mutateAsync({ operationId: id, currency: op.currency })
      .catch(() => { /* swallow — UX invisível */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSiscomex?.key, op?.release_trigger, op?.status, settlement?.id]);

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
  const hasReceipt = !!op.payment_receipt_url;
  const showUpload = isPending(op.status) || isUnderReview(op.status);
  const showHackathon = isUnderReview(op.status) || isPending(op.status);
  const showPaymentActions = showUpload || showHackathon;

  async function handleSubmit() {
    if (!file || !user?.id) return;
    setUploading(true); setErrMsg(null);
    try {
      const path = await operationsDb.uploadReceipt(user.id, id, file);
      await submitReceipt.mutateAsync({ id, url: path, name: file.name });
      setFile(null);
    } catch (e) {
      setErrMsg("Erro ao enviar comprovante: " + (e as Error).message);
    } finally { setUploading(false); }
  }

  async function handleValidate() {
    await validate.mutateAsync(id);
  }

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
        <span className={"chip text-[11px] " + meta.chip}>
          <span className="pulse-dot before:inline-block before:mr-1.5" />{meta.label}
        </span>
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
          <div className="flex-1">
            <h2 className="text-xl font-semibold">{meta.label}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Status atualizado em {new Date(op.updated_at).toLocaleString("pt-BR")}
            </p>
          </div>
          {isPending(op.status) && (
            <Link
              to="/operacoes/$id/pagamento"
              params={{ id }}
              className="btn-primary rounded-xl px-4 py-2 text-xs font-semibold"
            >
              Ver PIX / Pagamento
            </Link>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <Info label="Garantia protegida" value={formatCurrency(getProtectedAmount(op), op.currency)} />
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

      {/* ---------- FX reference (USD conversion) ---------- */}
      <FxReferenceCard op={op} />

      {/* ---------- Liquidação Internacional ---------- */}
      {settlement && <SettlementCard settlement={settlement} op={op} />}

      {/* ---------- Operational workspace: timeline (left) + upload (right) ---------- */}
      <div className={(showPaymentActions ? "grid lg:grid-cols-2" : "grid grid-cols-1") + " gap-5 mt-5 items-start"}>
        {/* LEFT — Timeline */}
        <div className="card-surface p-6 order-2 lg:order-1">
          <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-secondary" /> Timeline operacional
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleTestStellarWallet}
                disabled={walletDebugLoading}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-mono uppercase tracking-widest border border-muted-foreground/30 text-muted-foreground hover:bg-muted/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="DEBUG — gera wallet Stellar testnet e persiste em operations.operation_wallet"
              >
                {walletDebugLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wallet className="h-3.5 w-3.5" />
                )}
                Testar wallet Stellar
              </button>
              <button
                onClick={advanceSiscomex}
                disabled={advancing || siscomexIdx >= SISCOMEX_SEQUENCE.length - 1}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-mono uppercase tracking-widest border border-secondary/40 text-secondary hover:bg-secondary/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Avança o próximo evento Siscomex (simulador) — persistido em current_operational_status"
              >
                {advancing
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <PlayCircle className="h-3.5 w-3.5" />}
                Simular evento operacional
              </button>
            </div>
          </div>
          <OperationTimeline
            op={op}
            settlement={settlement ?? null}
            siscomexStatus={currentSiscomex}
          />
        </div>


        {/* RIGHT — receipt + hackathon validation */}
        {showPaymentActions && <div className="space-y-5 order-1 lg:order-2">

          {showUpload ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-surface p-6 ring-1 ring-secondary/30 shadow-[0_0_24px_-12px_oklch(0.66_0.11_235/0.6)]"
            >
              <div className="flex items-start gap-3 mb-4">
                <Upload className="h-5 w-5 text-secondary mt-0.5" />
                <div>
                  <h3 className="text-base font-semibold">Comprovante da garantia</h3>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Anexe o comprovante (PIX, TED ou SWIFT) para liberar o monitoramento.
                  </p>
                </div>
              </div>

              {hasReceipt ? (
                <div className="p-4 rounded-xl bg-success/10 border border-success/30 flex items-center gap-3">
                  <FileCheck2 className="h-5 w-5 text-success shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{op.payment_receipt_name || "Comprovante enviado"}</div>
                    <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                      {op.payment_submitted_at ? new Date(op.payment_submitted_at).toLocaleString("pt-BR") : "—"}
                    </div>
                  </div>
                  {signedUrl && (
                    <a href={signedUrl} target="_blank" rel="noreferrer"
                      className="text-xs text-secondary hover:underline inline-flex items-center gap-1">
                      <ExternalLink className="h-3.5 w-3.5" /> Ver
                    </a>
                  )}
                </div>
              ) : (
                <>
                  <label
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault(); setDragOver(false);
                      const f = e.dataTransfer.files?.[0]; if (f) setFile(f);
                    }}
                    className={
                      "block rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all " +
                      (dragOver
                        ? "border-secondary bg-secondary/10"
                        : file
                          ? "border-success/40 bg-success/5"
                          : "border-border hover:border-secondary/50 hover:bg-surface-container")
                    }
                  >
                    <input type="file" accept="image/*,application/pdf" className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                    {file ? (
                      <>
                        <FileCheck2 className="h-6 w-6 text-success mx-auto mb-2" />
                        <div className="text-sm font-semibold truncate">{file.name}</div>
                        <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                          {(file.size / 1024).toFixed(0)} KB · {file.type.split("/")[1]?.toUpperCase() || "FILE"}
                        </div>
                        <button
                          onClick={(e) => { e.preventDefault(); setFile(null); }}
                          className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" /> Remover
                        </button>
                      </>
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                        <div className="text-sm font-medium">Arraste ou selecione o arquivo</div>
                        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-1">
                          PDF · JPG · PNG · até 10MB
                        </div>
                      </>
                    )}
                  </label>
                  {errMsg && <div className="mt-3 text-xs text-destructive">{errMsg}</div>}
                  <button
                    onClick={handleSubmit}
                    disabled={!file || uploading}
                    className="btn-primary mt-4 w-full rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {uploading
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
                      : <><Upload className="h-4 w-4" /> Enviar comprovante</>}
                  </button>
                </>
              )}

              {/* Hackathon validation — compact, aligned to upload */}
              {showHackathon && (
                <div className="mt-5 pt-5 border-t border-border/60 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles className="h-4 w-4 text-accent shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">Validar garantia</span>
                        <span className="chip text-[8px] font-mono uppercase tracking-widest"
                          style={{ background: "color-mix(in oklab, var(--accent) 18%, transparent)", color: "var(--accent)" }}>
                          Hackathon mode
                        </span>
                      </div>
                      {!hasReceipt && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Envie o comprovante para habilitar.
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleValidate}
                    disabled={validate.isPending || !hasReceipt}
                    className="rounded-lg px-3.5 py-2 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                    style={{ background: "var(--gradient-accent)" }}
                    title={!hasReceipt ? "Envie o comprovante antes de validar" : "Validar garantia"}
                  >
                    {validate.isPending
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Validando</>
                      : <><CheckCircle2 className="h-3.5 w-3.5" /> Validar</>}
                  </button>
                </div>
              )}
            </motion.div>
          ) : null}
        </div>}
      </div>



    </AppShell>
  );
}

/* ----------------------------- Components ----------------------------- */

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

/* ----------------------------- FX Reference ----------------------------- */

function FxReferenceCard({ op }: { op: DBOperation }) {
  const original = (op.operation_currency || op.currency || "USD").toUpperCase();
  const rate = op.usd_conversion_rate != null ? Number(op.usd_conversion_rate) : null;
  const usdValue = op.usd_normalized_value != null ? Number(op.usd_normalized_value) : null;
  const refDate = op.fx_reference_date || op.created_at;
  if (original === "USD" && rate == null && usdValue == null) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="card-surface p-5 mt-5 flex flex-wrap items-center gap-5 ring-1 ring-secondary/20"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Globe className="h-4 w-4 text-secondary" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Conversão de referência
        </span>
      </div>
      <div className="flex items-center gap-3 text-sm font-mono">
        <span className="text-foreground">
          {formatCurrency(Number(op.protected_amount), original)}
        </span>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-secondary font-bold">
          {usdValue != null
            ? formatCurrency(usdValue, "USD")
            : formatCurrency(Number(op.protected_amount), "USD")}
        </span>
      </div>
      {rate != null && (
        <div className="text-xs text-muted-foreground font-mono">
          Taxa: 1 {original} = {rate.toFixed(4)} USD
        </div>
      )}
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground ml-auto">
        Cotação em {new Date(refDate).toLocaleString("pt-BR")}
      </div>
    </motion.div>
  );
}



type TimelineStage = {
  key: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  at?: string | null;
};

function OperationTimeline({ op, settlement, siscomexStatus }: {
  op: { status: string; created_at: string; updated_at: string; activated_at: string | null; payment_submitted_at: string | null };
  settlement: Settlement | null;
  siscomexStatus: { key: SiscomexKey; label: string } | null;
}) {
  const status = op.status;
  const order = [
    "PENDING_PAYMENT", "PAYMENT_UNDER_REVIEW",
    "OPERATION_MONITORING", "ACTIVE",
    "PAYMENT_RELEASED", "COMPLETED",
  ];
  const idx = order.indexOf(status);
  const reached = (minIdx: number) => idx >= minIdx;
  const settledAt = settlement?.created_at ?? null;
  const settledOk = !!settlement?.successful;

  const monitoringDesc = siscomexStatus
    ? `Status atual: ${siscomexStatus.label}`
    : "Status atual: aguardando primeiro evento Siscomex";

  const stages: TimelineStage[] = [
    { key: "registered", title: "Operação registrada", desc: "Processo operacional criado e vinculado ao Siscomex.", icon: FileText, at: op.created_at },
    { key: "pending", title: "Garantia aguardando depósito", desc: "Aguardando pagamento via PIX, TED ou SWIFT.", icon: Banknote, at: reached(0) ? op.created_at : null },
    { key: "received", title: "Comprovante recebido", desc: "Comprovante enviado pelo importador.", icon: FileCheck2, at: op.payment_submitted_at },
    { key: "validated", title: "Garantia validada", desc: "Compliance confirmou os fundos em custódia.", icon: Shield, at: op.activated_at },
    { key: "monitoring", title: "Monitoramento operacional", desc: monitoringDesc, icon: Truck, at: reached(2) ? op.activated_at : null },
    { key: "settlement_started", title: "Liquidação internacional iniciada", desc: "Liquidação internacional disparada pelo motor de pagamentos.", icon: Radio, at: settledAt },
    { key: "settlement_confirmed", title: "Liquidação internacional confirmada", desc: "Rede internacional confirmou a liquidação dos fundos.", icon: Landmark, at: settledOk ? settledAt : null },
    { key: "settled", title: "Operação liquidada", desc: "Ciclo financeiro encerrado com sucesso.", icon: PackageCheck, at: settledOk ? settledAt : null },
  ];

  // Determine which stage is "active" (the current one in progress).
  const lastDoneIdx = stages.reduce((acc, s, i) => (s.at ? i : acc), -1);
  const activeIdx = Math.min(lastDoneIdx + 1, stages.length - 1);

  return (
    <ol className="relative border-l border-border ml-3 space-y-5">
      {stages.map((s, i) => {
        const done = !!s.at && i <= lastDoneIdx;
        const active = i === activeIdx && !done && status !== "CANCELLED";
        const Icon = s.icon;
        return (
          <motion.li
            key={s.key}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
            className="pl-7 relative"
          >
            <span
              className={
                "absolute -left-[14px] top-0 h-7 w-7 rounded-full grid place-items-center ring-2 ring-background transition-all " +
                (done
                  ? "bg-success text-success-foreground"
                  : active
                    ? "bg-secondary text-secondary-foreground shadow-[0_0_14px_oklch(0.66_0.11_235/0.55)]"
                    : "bg-surface-container text-muted-foreground border border-border")
              }
            >
              {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              {active && (
                <span className="absolute inset-0 rounded-full ring-2 ring-secondary/60 animate-ping" />
              )}
            </span>
            <div className={"text-sm font-semibold " + (done || active ? "text-foreground" : "text-muted-foreground")}>
              {s.title}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.desc}</div>
            <div className="text-[10px] font-mono text-muted-foreground mt-1">
              {s.at ? new Date(s.at).toLocaleString("pt-BR") : active ? "Em andamento" : "Pendente"}
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}

/* ----------------------------- Settlement Card ----------------------------- */

function SettlementCard({ settlement, op }: { settlement: Settlement; op: DBOperation }) {
  const [open, setOpen] = useState(false);
  const explorer = `https://stellar.expert/explorer/testnet/tx/${settlement.tx_hash}`;
  const ok = settlement.successful;
  const fiatCurrency = (settlement.operation_currency || op.currency || "USD").toUpperCase();
  const fiatAmount = Number(op.protected_amount ?? op.operation_value ?? 0);
  const confirmation = settlement.confirmation_code || "—";

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="card-surface p-6 mt-5 ring-1 ring-secondary/30 shadow-[0_0_28px_-14px_oklch(0.66_0.11_235/0.55)]"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl grid place-items-center bg-secondary/10 ring-1 ring-secondary/30">
              <Landmark className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Liquidação Internacional</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-mono uppercase tracking-widest">
                Settlement enterprise · Infraestrutura global
              </p>
            </div>
          </div>
          <span
            className={
              "chip text-[10px] font-mono uppercase tracking-widest " +
              (ok ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")
            }
          >
            <span className="pulse-dot before:inline-block before:mr-1.5" />
            {ok ? "Pagamento confirmado" : "Falha na liquidação"}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <SettlementField label="Beneficiário" value={op.exporter_name || "—"} />
          <SettlementField label="País destino" value={op.beneficiary_country || "—"} />
          <SettlementField label="Valor liquidado" value={formatCurrency(fiatAmount, fiatCurrency)} highlight={ok} />
          <SettlementField label="Código de confirmação" value={confirmation} mono />
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 flex-wrap pt-4 border-t border-border/60">
          <div className="text-[11px] font-mono text-muted-foreground">
            Liquidado em {new Date(settlement.created_at).toLocaleString("pt-BR")}
          </div>
          <button
            onClick={() => setOpen(true)}
            className="btn-primary inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold"
          >
            <Receipt className="h-3.5 w-3.5" />
            Ver comprovante internacional
          </button>
        </div>
      </motion.div>

      <InternationalReceiptDialog
        open={open}
        onOpenChange={setOpen}
        op={op}
        settlement={settlement}
        explorerUrl={explorer}
      />
    </>
  );
}

function SettlementField({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={"mt-1 text-sm " + (mono ? "font-mono " : "") + (highlight ? "text-success font-semibold" : "font-medium")}>
        {value}
      </div>
    </div>
  );
}

/* --------------------- International Receipt Dialog --------------------- */

function InternationalReceiptDialog({
  open, onOpenChange, op, settlement, explorerUrl,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  op: DBOperation;
  settlement: Settlement;
  explorerUrl: string;
}) {
  const fiatCurrency = (settlement.operation_currency || op.currency || "USD").toUpperCase();
  const fiatAmount = Number(op.protected_amount ?? op.operation_value ?? 0);
  const confirmation = settlement.confirmation_code || "—";
  const ts = new Date(settlement.created_at);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden bg-background border-border">
        {/* Header — institutional bar */}
        <div className="relative bg-gradient-to-br from-secondary/15 via-background to-background border-b border-border px-7 pt-7 pb-5">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl grid place-items-center bg-secondary/15 ring-1 ring-secondary/40">
                  <Building2 className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    TXLOGPAY · International Transfer
                  </div>
                  <DialogTitle className="text-lg font-semibold mt-0.5">
                    Comprovante de Liquidação
                  </DialogTitle>
                </div>
              </div>
              <span className="chip text-[10px] font-mono uppercase tracking-widest bg-success/15 text-success">
                <ShieldCheck className="h-3 w-3" /> Pagamento confirmado
              </span>
            </div>
          </DialogHeader>
        </div>

        {/* Amount block */}
        <div className="px-7 py-6 border-b border-border/60">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Valor da liquidação
          </div>
          <div className="text-3xl font-mono font-bold text-secondary mt-1">
            {formatCurrency(fiatAmount, fiatCurrency)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Liquidado em {ts.toLocaleString("pt-BR")} · {ts.toUTCString().split(" ").slice(-2, -1)[0]} UTC referência
          </div>
        </div>

        {/* Beneficiary block */}
        <div className="px-7 py-5 space-y-3 border-b border-border/60">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            Dados do beneficiário
          </div>
          <ReceiptRow k="Beneficiário" v={op.exporter_name || "—"} />
          <ReceiptRow k="Banco destinatário" v={op.bank_name || "—"} />
          <ReceiptRow k="SWIFT / BIC" v={op.swift || "—"} mono />
          <ReceiptRow k="IBAN" v={op.iban || "—"} mono />
          <ReceiptRow k="País / Cidade" v={`${op.beneficiary_country || "—"} · ${op.beneficiary_city || "—"}`} />
        </div>

        {/* Operation block */}
        <div className="px-7 py-5 space-y-3 border-b border-border/60">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            Referência operacional
          </div>
          <ReceiptRow k="Operação" v={op.operation_code} mono />
          <ReceiptRow k="Invoice" v={op.invoice_number || "—"} mono />
          <ReceiptRow k="Código de confirmação" v={confirmation} mono highlight />
          <ReceiptRow k="Status" v="Pagamento confirmado" highlight />
        </div>

        {/* Footer — discreet audit link */}
        <div className="px-7 py-4 bg-surface-container/40 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Documento gerado automaticamente · TXLOGPAY Settlement Engine
          </div>
          <a
            href={explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-muted-foreground hover:text-secondary transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            Ver registro auditável
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReceiptRow({ k, v, mono, highlight }: { k: string; v: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className={(mono ? "font-mono " : "") + (highlight ? "text-secondary font-semibold" : "font-medium")}>{v}</span>
    </div>
  );
}

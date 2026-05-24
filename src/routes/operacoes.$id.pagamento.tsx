import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  Clock, Upload, CheckCircle2, ShieldCheck, Loader2, AlertTriangle,
  ClipboardCopy, FileCheck2, X, ExternalLink,
} from "lucide-react";
import {
  useOperation, useSubmitReceipt, useValidatePayment,
} from "@/hooks/use-operations";
import { operationsDb } from "@/services/operations.db";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/formatters";
import { STATUS_META, isActive, isPending, isUnderReview } from "@/domain/operation-status";

export const Route = createFileRoute("/operacoes/$id/pagamento")({
  head: ({ params }) => ({ meta: [{ title: `Aguardando pagamento ${params.id} — TXLOGPAY` }] }),
  component: AwaitPayment,
});

function AwaitPayment() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: op, isLoading, error } = useOperation(id);
  const submitReceipt = useSubmitReceipt();
  const validate = useValidatePayment();

  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  // Auto-redirect when operation reaches an active state.
  useEffect(() => {
    if (op && isActive(op.status)) {
      navigate({ to: "/operacoes/$id", params: { id }, replace: true });
    }
  }, [op?.status, id, navigate]);

  // Fetch signed URL of the receipt if already submitted.
  useEffect(() => {
    if (op?.payment_receipt_url) {
      operationsDb.getReceiptUrl(op.payment_receipt_url).then(setSignedUrl);
    }
  }, [op?.payment_receipt_url]);

  if (isLoading) {
    return <AppShell><div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 text-secondary animate-spin" /></div></AppShell>;
  }
  if (error || !op) {
    return <AppShell><div className="card-surface p-10 text-center"><p className="text-destructive">Operação não encontrada</p></div></AppShell>;
  }

  const meta = STATUS_META[op.status] ?? STATUS_META.PENDING_PAYMENT;
  const hasReceipt = !!op.payment_receipt_url;

  async function handleSubmit() {
    if (!file || !user?.id) return;
    setUploading(true);
    setErrMsg(null);
    try {
      const path = await operationsDb.uploadReceipt(user.id, id, file);
      await submitReceipt.mutateAsync({ id, url: path, name: file.name });
      setFile(null);
    } catch (e) {
      console.error(e);
      setErrMsg("Erro ao enviar comprovante: " + (e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function handleValidate() {
    await validate.mutateAsync(id);
    navigate({ to: "/operacoes/$id", params: { id } });
  }

  const pixPayload = `00020126${op.operation_code}5204000053039865802BR5909TXLOGPAY6009SAO PAULO62070503***6304ABCD`;

  return (
    <AppShell>
      <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">
        <Link to="/operacoes" className="hover:text-foreground">Operações</Link> ›{" "}
        <span className="text-secondary">Pagamento</span>
      </div>

      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Clock className="h-7 w-7 text-warning" />
            {isUnderReview(op.status) ? "Pagamento em análise" : "Aguardando confirmação do pagamento"}
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Operação <span className="font-mono text-secondary">#{op.operation_code}</span> registrada.
            {isUnderReview(op.status)
              ? " Seu comprovante foi recebido e está sendo validado pela equipe de compliance."
              : " Realize o pagamento e envie o comprovante para que a operação entre em monitoramento."}
          </p>
        </div>
        <span className={"chip text-[11px] " + meta.chip}>
          <span className="pulse-dot before:inline-block before:mr-1.5" /> {meta.label}
        </span>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Breakdown */}
          <div className="card-surface p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-5">
              <ShieldCheck className="h-4 w-4 text-secondary" /> Resumo Financeiro
            </h2>
            <div className="space-y-3 p-4 rounded-xl glass">
              <Row label="Valor protegido" value={formatCurrency(Number(op.protected_amount), op.currency)} />
              <Row label="Taxa TXLOGPAY" value={formatCurrency(Number(op.fee_amount), op.currency)} />
              <div className="h-px bg-border my-1" />
              <Row label="Total a pagar" value={formatCurrency(Number(op.total_amount), op.currency)} highlight />
            </div>
          </div>

          {/* PIX + Bank instructions */}
          <div className="card-surface p-6">
            <h2 className="text-lg font-semibold mb-4">Instruções de Pagamento</h2>

            <div className="grid md:grid-cols-[160px_1fr] gap-5 items-start">
              {/* QR Code (placeholder svg) */}
              <div className="rounded-xl bg-white p-3 grid place-items-center">
                <QrPlaceholder payload={pixPayload} />
              </div>
              <div className="space-y-3 text-sm">
                <KV k="PIX copia e cola" v={pixPayload} copy mono small />
                <KV k="Banco" v="Standard Chartered (Global)" />
                <KV k="SWIFT / BIC" v="TXLPBRSPXXX" copy mono />
                <KV k="Conta operacional" v="8829-00129-2192-0" copy mono />
                <KV k="Referência" v={op.operation_code} copy mono />
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-accent/10 border border-accent/30 text-xs text-muted-foreground flex gap-2">
              <AlertTriangle className="h-4 w-4 text-accent shrink-0 mt-0.5" />
              <span>Após realizar o pagamento, anexe o comprovante abaixo. A operação só entra em monitoramento após validação.</span>
            </div>
          </div>

          {/* Upload */}
          <div className="card-surface p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Upload className="h-4 w-4 text-secondary" /> Comprovante de Pagamento
            </h2>

            {hasReceipt ? (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-success/10 border border-success/30 flex items-center gap-3">
                  <FileCheck2 className="h-5 w-5 text-success shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{op.payment_receipt_name || "Comprovante enviado"}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">
                      Enviado em {op.payment_submitted_at ? new Date(op.payment_submitted_at).toLocaleString("pt-BR") : "—"}
                    </div>
                  </div>
                  {signedUrl && (
                    <a
                      href={signedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-secondary hover:underline inline-flex items-center gap-1"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Visualizar
                    </a>
                  )}
                </div>
                <div className="chip chip-info text-[11px] inline-flex">
                  <span className="pulse-dot before:inline-block before:mr-1.5" /> Pagamento em análise
                </div>
              </div>
            ) : (
              <>
                <label
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) setFile(f);
                  }}
                  className={
                    "block rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all " +
                    (dragOver
                      ? "border-secondary bg-secondary/10"
                      : file
                        ? "border-success/40 bg-success/5"
                        : "border-border hover:border-secondary/50 hover:bg-surface-container")
                  }
                >
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  {file ? (
                    <>
                      <FileCheck2 className="h-7 w-7 text-success mx-auto mb-2" />
                      <div className="text-sm font-semibold truncate">{file.name}</div>
                      <div className="text-xs text-muted-foreground mt-1 font-mono">
                        {(file.size / 1024).toFixed(0)} KB · {file.type.split("/")[1]?.toUpperCase() || "FILE"}
                      </div>
                      <button
                        onClick={(e) => { e.preventDefault(); setFile(null); }}
                        className="mt-3 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" /> Remover
                      </button>
                    </>
                  ) : (
                    <>
                      <Upload className="h-7 w-7 text-muted-foreground mx-auto mb-2" />
                      <div className="text-sm font-medium">Arraste o comprovante ou clique para selecionar</div>
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
                  className="btn-primary mt-4 w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploading
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
                    : <><Upload className="h-4 w-4" /> Confirmar envio do comprovante</>}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Admin / Hackathon sidebar */}
        <div className="space-y-5">
          <div className="card-surface p-6 ring-1 ring-accent/40">
            <div className="text-[10px] font-mono uppercase tracking-widest text-accent mb-2">
              ⚡ Hackathon · Admin temporário
            </div>
            <h3 className="font-semibold mb-2">Validação Manual</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Botão temporário para simular validação do comprovante pela equipe de compliance.
              Em produção, isso ocorre via reconciliação bancária automática.
            </p>
            <button
              onClick={handleValidate}
              disabled={validate.isPending || !hasReceipt}
              className="w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: "var(--gradient-accent)" }}
            >
              {validate.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Validando...</>
                : <><CheckCircle2 className="h-4 w-4" /> Validar pagamento</>}
            </button>
            {!hasReceipt && (
              <p className="text-[10px] text-muted-foreground mt-3 text-center">
                Envie o comprovante para habilitar a validação.
              </p>
            )}
          </div>

          <div className="card-surface p-6">
            <h3 className="text-sm font-semibold mb-3">Fluxo do pagamento</h3>
            <ol className="space-y-3 text-xs text-muted-foreground">
              <Step n={1} active={isPending(op.status)} done={isUnderReview(op.status) || isActive(op.status)}>
                Realizar pagamento (PIX/TED/SWIFT)
              </Step>
              <Step n={2} active={isPending(op.status) && !!file} done={hasReceipt}>
                Enviar comprovante
              </Step>
              <Step n={3} active={isUnderReview(op.status)} done={isActive(op.status)}>
                Pagamento em análise
              </Step>
              <Step n={4} active={false} done={isActive(op.status)}>
                Operação em monitoramento
              </Step>
            </ol>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Step({ n, active, done, children }: { n: number; active: boolean; done: boolean; children: React.ReactNode }) {
  return (
    <li className="flex gap-2 items-start">
      <span className={
        "h-5 w-5 rounded-full grid place-items-center text-[10px] font-mono shrink-0 " +
        (done ? "bg-success text-success-foreground" : active ? "bg-secondary text-secondary-foreground" : "bg-surface-container text-muted-foreground border border-border")
      }>
        {done ? <CheckCircle2 className="h-3 w-3" /> : n}
      </span>
      <span className={done || active ? "text-foreground" : ""}>{children}</span>
    </li>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className={highlight ? "text-foreground font-semibold" : "text-muted-foreground"}>{label}</span>
      <span className={"font-mono " + (highlight ? "text-secondary font-bold text-base" : "")}>{value}</span>
    </div>
  );
}

function KV({ k, v, copy, mono, small }: { k: string; v: string; copy?: boolean; mono?: boolean; small?: boolean }) {
  return (
    <div className="flex justify-between items-center gap-3 p-3 rounded-lg bg-surface-container-low">
      <span className="text-xs text-muted-foreground shrink-0">{k}</span>
      <span className={(mono ? "font-mono " : "") + (small ? "text-[11px] " : "text-sm ") + "flex items-center gap-2 min-w-0"}>
        <span className="truncate">{v}</span>
        {copy && (
          <button
            onClick={() => navigator.clipboard?.writeText(v)}
            className="text-muted-foreground hover:text-secondary shrink-0"
            title="Copiar"
          >
            <ClipboardCopy className="h-3.5 w-3.5" />
          </button>
        )}
      </span>
    </div>
  );
}

/** Decorative QR placeholder (deterministic dot grid from payload hash). */
function QrPlaceholder({ payload }: { payload: string }) {
  const size = 21;
  let h = 0;
  for (let i = 0; i < payload.length; i++) h = (h * 31 + payload.charCodeAt(i)) >>> 0;
  const cells: boolean[] = [];
  for (let i = 0; i < size * size; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    cells.push((h & 1) === 1);
  }
  // Force finder patterns at corners
  const inFinder = (x: number, y: number) =>
    (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-32 h-32">
      <rect width={size} height={size} fill="#fff" />
      {Array.from({ length: size * size }).map((_, i) => {
        const x = i % size, y = Math.floor(i / size);
        const on = inFinder(x, y) ? ((x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4)) && !(x === 7 || y === 7)) : cells[i];
        return on ? <rect key={i} x={x} y={y} width={1} height={1} fill="#0a1018" /> : null;
      })}
    </svg>
  );
}

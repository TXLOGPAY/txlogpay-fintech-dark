import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState, useCallback, type ChangeEvent, type DragEvent } from "react";
import { AppShell } from "@/components/AppShell";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText, CreditCard, Lock, ShieldCheck, Check, Upload, Banknote,
  Building2, ArrowRight, ArrowLeft, Loader2, QrCode, Activity, Sparkles,
  ClipboardCopy, FileCheck2, Globe2, Wallet, AlertCircle, Hash,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  INCOTERMS, CURRENCIES, RELEASE_STAGES,
  type CommercialData, type OperationDocuments, type ExporterBank,
  type Guarantee, type GuaranteeMethod, type DocumentRef, type Operation,
} from "@/types/operation";
import { operationsService, fileToRef, buildMockPixPayload } from "@/lib/operations/service";

export const Route = createFileRoute("/operacoes/conectar")({
  head: () => ({ meta: [{ title: "Nova Operação — TXLOGPAY" }] }),
  component: NovaOperacao,
});

type StepIndex = 0 | 1 | 2 | 3 | 4;

const STEPS = [
  { label: "Dados Comerciais",     icon: FileText },
  { label: "Documentação",         icon: FileCheck2 },
  { label: "Dados Bancários",      icon: Banknote },
  { label: "Garantia Operacional", icon: ShieldCheck },
  { label: "Operação Ativada",     icon: Sparkles },
] as const;

function NovaOperacao() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<StepIndex>(0);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<Operation | null>(null);

  const [commercial, setCommercial] = useState<CommercialData>({
    incoterm: "", valor: "", moeda: "USD", releaseStage: "",
  });
  const [documents, setDocuments] = useState<OperationDocuments>({
    invoiceNumber: "", blAwb: "", duimp: "", siscomex: "",
  });
  const [bank, setBank] = useState<ExporterBank>({
    exporterName: "", bank: "", swift: "", iban: "",
    country: "", city: "", beneficiary: "",
  });
  const [guarantee, setGuarantee] = useState<Guarantee>({
    method: "pix", status: "aguardando",
  });

  const stepValid = useMemo(() => {
    if (step === 0) return !!commercial.incoterm && !!commercial.valor && !!commercial.releaseStage;
    if (step === 1) return !!documents.invoiceNumber && !!documents.blAwb && !!documents.duimp;
    if (step === 2) return !!bank.exporterName && !!bank.bank && !!bank.swift && !!bank.iban;
    if (step === 3) return !!guarantee.method;
    return true;
  }, [step, commercial, documents, bank, guarantee]);

  const next = () => setStep((s) => (Math.min(4, s + 1) as StepIndex));
  const prev = () => setStep((s) => (Math.max(0, s - 1) as StepIndex));

  async function handleActivate() {
    setSubmitting(true);
    try {
      const op = await operationsService.create({
        userId: user?.id ?? null,
        commercial, documents, bank,
        guarantee: { ...guarantee, status: "monitorando" },
      });
      setCreated(op);
      setStep(4);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">
        <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link> ›{" "}
        <Link to="/operacoes" className="hover:text-foreground">Operações</Link> ›{" "}
        <span className="text-secondary">Nova Operação</span>
      </div>

      <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Nova Operação Internacional</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Registre uma operação já existente no Siscomex para monitoramento operacional,
            garantia financeira e liquidação automática vinculada a eventos aduaneiros.
          </p>
        </div>
        <span className="chip chip-cargo text-[11px]">
          <ShieldCheck className="h-3.5 w-3.5" />Trade finance enterprise
        </span>
      </div>

      <Stepper current={step} />

      <div className="grid lg:grid-cols-3 gap-5 mt-8">
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {step === 0 && <Step1Commercial value={commercial} onChange={setCommercial} />}
              {step === 1 && <Step2Documents value={documents} onChange={setDocuments} />}
              {step === 2 && <Step3Bank value={bank} onChange={setBank} />}
              {step === 3 && <Step4Guarantee value={guarantee} onChange={setGuarantee} commercial={commercial} />}
              {step === 4 && created && <Step5Activated op={created} onGo={() => navigate({ to: "/operacoes/$id", params: { id: created.id } })} />}
            </motion.div>
          </AnimatePresence>

          {step < 4 && (
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={prev}
                disabled={step === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>

              {step < 3 ? (
                <button
                  onClick={next}
                  disabled={!stepValid}
                  className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continuar <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleActivate}
                  disabled={submitting || !stepValid}
                  className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
                >
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Ativando...</> : <><ShieldCheck className="h-4 w-4" /> Ativar Operação</>}
                </button>
              )}
            </div>
          )}
        </div>

        <SidePanel step={step} commercial={commercial} />
      </div>
    </AppShell>
  );
}

/* ----------------------------- Stepper ----------------------------- */

function Stepper({ current }: { current: StepIndex }) {
  const progress = (current / (STEPS.length - 1)) * 100;
  return (
    <div className="card-surface p-5">
      <div className="relative">
        <div className="absolute left-5 right-5 top-5 h-px bg-border" />
        <div
          className="absolute left-5 top-5 h-px transition-all duration-500"
          style={{ width: `calc((100% - 2.5rem) * ${progress / 100})`, background: "var(--gradient-brand)" }}
        />
        <div className="relative grid grid-cols-5 gap-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < current;
            const active = i === current;
            return (
              <div key={s.label} className="flex flex-col items-center text-center">
                <div className={
                  "h-10 w-10 rounded-full grid place-items-center border transition-all " +
                  (active
                    ? "bg-secondary text-secondary-foreground border-secondary shadow-[0_0_24px_oklch(0.85_0.18_200/0.6)]"
                    : done
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-surface-container border-border text-muted-foreground")
                }>
                  {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className={"mt-2 text-[10px] font-mono uppercase tracking-wider " + (active ? "text-secondary" : done ? "text-foreground" : "text-muted-foreground")}>
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Step 1: Commercial ----------------------------- */

function Step1Commercial({ value, onChange }: {
  value: CommercialData; onChange: (v: CommercialData) => void;
}) {
  const set = <K extends keyof CommercialData>(k: K, v: CommercialData[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="card-surface p-6 space-y-6">
      <header>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <FileText className="h-4 w-4 text-secondary" /> Dados Comerciais
        </h2>
        <p className="text-xs text-muted-foreground mt-1">Termos da operação internacional já registrada no Siscomex.</p>
      </header>

      <div className="grid md:grid-cols-2 gap-5">
        <Field label="Incoterm">
          <Select value={value.incoterm} onChange={(v) => set("incoterm", v as CommercialData["incoterm"])}
            options={[{ value: "", label: "Selecione..." }, ...INCOTERMS.map((i) => ({ value: i, label: i }))]} />
        </Field>

        <Field label="Moeda">
          <Select value={value.moeda} onChange={(v) => set("moeda", v as CommercialData["moeda"])}
            options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
        </Field>

        <Field label="Valor da operação" className="md:col-span-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">{value.moeda}</span>
            <Input
              className="pl-14 text-lg font-semibold"
              placeholder="0,00"
              inputMode="decimal"
              value={value.valor}
              onChange={(e) => set("valor", e.target.value)}
            />
          </div>
        </Field>
      </div>

      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
          Etapa de liberação automática do pagamento
        </div>
        <div className="grid sm:grid-cols-2 gap-2.5">
          {RELEASE_STAGES.map((s) => {
            const active = value.releaseStage === s.value;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => set("releaseStage", s.value)}
                className={
                  "text-left rounded-xl px-4 py-3 border transition-all " +
                  (active
                    ? "border-secondary bg-secondary/10 ring-1 ring-secondary shadow-[0_0_20px_oklch(0.85_0.18_200/0.25)]"
                    : "border-border hover:border-secondary/50 hover:bg-surface-container")
                }
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{s.label}</span>
                  {active && <Check className="h-4 w-4 text-secondary" />}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      <Callout icon={Activity}>
        O pagamento será liberado automaticamente quando o evento operacional selecionado for confirmado.
      </Callout>
    </div>
  );
}

/* ----------------------------- Step 2: Documents ----------------------------- */

function Step2Documents({ value, onChange }: {
  value: OperationDocuments; onChange: (v: OperationDocuments) => void;
}) {
  const set = <K extends keyof OperationDocuments>(k: K, v: OperationDocuments[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="card-surface p-6 space-y-6">
      <header>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <FileCheck2 className="h-4 w-4 text-secondary" /> Documentação Operacional
        </h2>
        <p className="text-xs text-muted-foreground mt-1">Documentos vinculados ao processo Siscomex.</p>
      </header>

      <div className="grid md:grid-cols-2 gap-5">
        <Field label="Número da Invoice">
          <Input value={value.invoiceNumber} onChange={(e) => set("invoiceNumber", e.target.value)} placeholder="INV-2024-XXXXX" />
        </Field>
        <Field label="Bill of Lading / AWB">
          <Input value={value.blAwb} onChange={(e) => set("blAwb", e.target.value)} placeholder="HLCUBSC..." />
        </Field>
        <Field label="Número DUIMP">
          <Input value={value.duimp} onChange={(e) => set("duimp", e.target.value)} placeholder="24/0000000-0" />
        </Field>
        <Field label="Número do processo Siscomex">
          <Input value={value.siscomex} onChange={(e) => set("siscomex", e.target.value)} placeholder="SISCOMEX-..." />
        </Field>
      </div>

      <div className="space-y-3">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Anexos</div>
        <div className="grid md:grid-cols-3 gap-3">
          <Dropzone label="Invoice (PDF)" file={value.invoiceFile} onFile={(f) => set("invoiceFile", f)} />
          <Dropzone label="Packing List" file={value.packingFile} onFile={(f) => set("packingFile", f)} />
          <Dropzone label="BL / AWB" file={value.blAwbFile} onFile={(f) => set("blAwbFile", f)} />
        </div>
      </div>
    </div>
  );
}

function Dropzone({ label, file, onFile }: {
  label: string; file?: DocumentRef; onFile: (f: DocumentRef | undefined) => void;
}) {
  const [over, setOver] = useState(false);
  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault(); setOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(fileToRef(f));
  };
  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFile(fileToRef(f));
  };
  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={
        "relative flex flex-col items-center justify-center gap-2 rounded-xl p-5 border-2 border-dashed cursor-pointer transition-all min-h-[140px] text-center " +
        (over
          ? "border-secondary bg-secondary/10"
          : file
            ? "border-success/50 bg-success/5"
            : "border-border hover:border-secondary/50 hover:bg-surface-container")
      }
    >
      <input type="file" className="hidden" onChange={onPick} accept=".pdf,.png,.jpg,.jpeg" />
      {file ? (
        <>
          <FileCheck2 className="h-6 w-6 text-secondary" />
          <div className="text-xs font-medium truncate max-w-full">{file.name}</div>
          <div className="font-mono text-[10px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</div>
        </>
      ) : (
        <>
          <Upload className="h-6 w-6 text-muted-foreground" />
          <div className="text-xs font-medium">{label}</div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Arraste ou clique</div>
        </>
      )}
    </label>
  );
}

/* ----------------------------- Step 3: Bank ----------------------------- */

function Step3Bank({ value, onChange }: {
  value: ExporterBank; onChange: (v: ExporterBank) => void;
}) {
  const set = <K extends keyof ExporterBank>(k: K, v: ExporterBank[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="card-surface p-6 space-y-6">
      <header>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Banknote className="h-4 w-4 text-secondary" /> Dados Bancários do Exportador
        </h2>
        <p className="text-xs text-muted-foreground mt-1">Beneficiário internacional da liquidação automática.</p>
      </header>

      <div className="grid md:grid-cols-2 gap-5">
        <Field label="Nome do exportador" className="md:col-span-2">
          <Input value={value.exporterName} onChange={(e) => set("exporterName", e.target.value)} placeholder="Acme Industries Ltd." />
        </Field>
        <Field label="Banco">
          <Input value={value.bank} onChange={(e) => set("bank", e.target.value)} placeholder="HSBC Hong Kong" />
        </Field>
        <Field label="SWIFT / BIC">
          <Input value={value.swift} onChange={(e) => set("swift", e.target.value)} placeholder="HSBCHKHHHKH" className="font-mono uppercase" />
        </Field>
        <Field label="IBAN / Conta">
          <Input value={value.iban} onChange={(e) => set("iban", e.target.value)} placeholder="HK00 0000 0000 0000" className="font-mono" />
        </Field>
        <Field label="Beneficiário">
          <Input value={value.beneficiary} onChange={(e) => set("beneficiary", e.target.value)} placeholder="Nome do beneficiário" />
        </Field>
        <Field label="País">
          <Input value={value.country} onChange={(e) => set("country", e.target.value)} placeholder="Hong Kong" />
        </Field>
        <Field label="Cidade">
          <Input value={value.city} onChange={(e) => set("city", e.target.value)} placeholder="Kowloon" />
        </Field>
      </div>
    </div>
  );
}

/* ----------------------------- Step 4: Guarantee ----------------------------- */

function Step4Guarantee({ value, onChange, commercial }: {
  value: Guarantee; onChange: (v: Guarantee) => void;
  commercial: CommercialData;
}) {
  const set = <K extends keyof Guarantee>(k: K, v: Guarantee[K]) =>
    onChange({ ...value, [k]: v });

  const pixPayload = useMemo(
    () => buildMockPixPayload(commercial.valor || "0", commercial.incoterm || "OP"),
    [commercial.valor, commercial.incoterm],
  );

  const methods: { id: GuaranteeMethod; label: string; icon: typeof CreditCard; hint: string }[] = [
    { id: "pix",   label: "PIX",                     icon: QrCode,  hint: "Instantâneo · BRL" },
    { id: "ted",   label: "Transferência bancária",  icon: Wallet,  hint: "Doméstica · 1h" },
    { id: "swift", label: "SWIFT internacional",     icon: Globe2,  hint: "Cross-border · 12-24h" },
  ];

  return (
    <div className="card-surface p-6 space-y-6">
      <header>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ShieldCheck className="h-4 w-4 text-secondary" /> Garantia Operacional
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Reserva financeira vinculada à operação internacional. Liberada automaticamente após o evento aduaneiro.
        </p>
      </header>

      <div className="grid sm:grid-cols-3 gap-2.5">
        {methods.map((m) => {
          const active = value.method === m.id;
          const Icon = m.icon;
          return (
            <button key={m.id} type="button" onClick={() => set("method", m.id)}
              className={
                "rounded-xl border p-4 text-left transition-all " +
                (active
                  ? "border-secondary bg-secondary/10 ring-1 ring-secondary"
                  : "border-border hover:border-secondary/50 hover:bg-surface-container")
              }>
              <Icon className={"h-5 w-5 mb-2 " + (active ? "text-secondary" : "text-muted-foreground")} />
              <div className="font-semibold text-sm">{m.label}</div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mt-0.5">{m.hint}</div>
            </button>
          );
        })}
      </div>

      {value.method === "pix" && (
        <div className="grid md:grid-cols-2 gap-5">
          <div className="rounded-xl glass p-5">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">QRCode PIX dinâmico</div>
            <div className="mx-auto h-48 w-48 rounded-xl bg-foreground/5 grid place-items-center p-3">
              <PixQR seed={pixPayload} />
            </div>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(pixPayload)}
              className="mt-4 w-full rounded-lg py-2.5 text-sm border border-border hover:bg-surface-container flex items-center justify-center gap-2"
            >
              <ClipboardCopy className="h-4 w-4" /> Pix copia e cola
            </button>
          </div>
          <div className="space-y-3">
            <UploadReceipt value={value.receiptFile} onChange={(f) => set("receiptFile", f)} />
            <StatusBlock guarantee={value} />
          </div>
        </div>
      )}

      {value.method !== "pix" && (
        <div className="grid md:grid-cols-2 gap-5">
          <div className="rounded-xl glass p-5 space-y-3 text-sm">
            <div className="font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-secondary" /> Dados para {value.method === "ted" ? "TED" : "SWIFT"}
            </div>
            <KV k="Banco parceiro" v="Standard Chartered (Global)" />
            <KV k="SWIFT / BIC" v="TXLPBRSPXXX" mono />
            <KV k="Conta operacional" v="8829-00129-2192-0" mono />
            <div className="p-3 rounded-lg bg-surface-container-low text-xs text-muted-foreground">
              Tempo estimado: {value.method === "ted" ? "até 1h útil" : "12-24h úteis"} para conciliação.
            </div>
          </div>
          <div className="space-y-3">
            <UploadReceipt value={value.receiptFile} onChange={(f) => set("receiptFile", f)} />
            <StatusBlock guarantee={value} />
          </div>
        </div>
      )}
    </div>
  );
}

function PixQR({ seed }: { seed: string }) {
  // Deterministic pseudo-QR pattern based on payload.
  const cells = useMemo(() => {
    const arr: boolean[] = [];
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
    for (let i = 0; i < 169; i++) {
      h = (h * 1103515245 + 12345) | 0;
      arr.push(((h >> 16) & 1) === 1);
    }
    return arr;
  }, [seed]);
  return (
    <div className="grid grid-cols-13 gap-[2px]" style={{ gridTemplateColumns: "repeat(13, 1fr)" }}>
      {cells.map((on, i) => (
        <span key={i} className={"h-2.5 w-2.5 rounded-[1px] " + (on ? "bg-foreground" : "bg-transparent")} />
      ))}
    </div>
  );
}

function UploadReceipt({ value, onChange }: { value?: DocumentRef; onChange: (f: DocumentRef | undefined) => void }) {
  return (
    <Dropzone label="Comprovante de pagamento" file={value} onFile={onChange} />
  );
}

function StatusBlock({ guarantee }: { guarantee: Guarantee }) {
  const steps: { id: Guarantee["status"]; label: string }[] = [
    { id: "aguardando",  label: "Pagamento aguardando confirmação" },
    { id: "reservada",   label: "Garantia operacional reservada" },
    { id: "monitorando", label: "Monitoramento iniciado" },
  ];
  const currentIdx = steps.findIndex((s) => s.id === guarantee.status);
  return (
    <div className="rounded-xl glass p-4 space-y-2.5">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Status</div>
      {steps.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={s.id} className="flex items-center gap-3 text-sm">
            <div className={
              "h-5 w-5 rounded-full grid place-items-center text-[10px] " +
              (done ? "bg-success/30 text-success border border-success/40"
                : active ? "bg-secondary text-secondary-foreground" : "bg-surface-container border border-border text-muted-foreground")
            }>
              {done ? <Check className="h-3 w-3" /> : i + 1}
            </div>
            <span className={active ? "text-foreground font-medium" : done ? "text-muted-foreground line-through" : "text-muted-foreground"}>
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------- Step 5: Activated ----------------------------- */

function Step5Activated({ op, onGo }: { op: Operation; onGo: () => void }) {
  return (
    <div className="card-surface p-8 space-y-6">
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-3">
        <div className="mx-auto h-16 w-16 rounded-full grid place-items-center shadow-[0_0_40px_oklch(0.85_0.18_200/0.5)]" style={{ background: "var(--gradient-brand)" }}>
          <Check className="h-8 w-8 text-primary-foreground" />
        </div>
        <h2 className="text-2xl font-bold">Operação ativada</h2>
        <p className="text-sm text-muted-foreground">
          ID <span className="font-mono text-foreground">{op.id}</span> · Status:{" "}
          <span className="chip chip-warning text-[10px] ml-1">Aguardando eventos aduaneiros</span>
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Summary label="Incoterm" value={op.commercial.incoterm || "—"} />
        <Summary label="Valor" value={`${op.commercial.moeda} ${op.commercial.valor || "0,00"}`} highlight />
        <Summary label="DUIMP" value={op.documents.duimp || "—"} mono />
      </div>

      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Timeline operacional</div>
        <ol className="relative border-l border-border ml-3 space-y-4">
          {op.timeline.map((e) => (
            <li key={e.id} className="pl-5 relative">
              <span className="absolute -left-[6px] top-1.5 h-3 w-3 rounded-full bg-secondary shadow-[0_0_10px_oklch(0.85_0.18_200/0.7)]" />
              <div className="text-sm font-medium">{e.label}</div>
              {e.description && <div className="text-xs text-muted-foreground">{e.description}</div>}
              <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{new Date(e.at).toLocaleString("pt-BR")}</div>
            </li>
          ))}
        </ol>
      </div>

      <button onClick={onGo} className="btn-primary w-full rounded-xl py-3.5 font-semibold flex items-center justify-center gap-2">
        Ir para painel da operação <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ----------------------------- Side panel ----------------------------- */

function SidePanel({ step, commercial }: { step: StepIndex; commercial: CommercialData }) {
  const titles = [
    "Termos comerciais",
    "Documentação Siscomex",
    "Liquidação internacional",
    "Custódia digital",
    "Operação em monitoramento",
  ] as const;
  const tips = [
    "Os termos definem como a garantia e a liquidação serão acionadas pelos eventos aduaneiros.",
    "Documentos digitalizados aceleram a conciliação automática e reduzem o risco de divergência.",
    "Os dados bancários serão utilizados para futura liquidação automática da operação.",
    "A garantia operacional fica vinculada à operação até a confirmação do evento aduaneiro selecionado.",
    "O monitoramento foi iniciado. Você pode acompanhar tudo no painel da operação.",
  ] as const;

  return (
    <div className="space-y-5">
      <div className="card-surface p-6 ring-1 ring-secondary/30">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-secondary" /> {titles[step]}
        </h3>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{tips[step]}</p>
        <div className="mt-4 space-y-2 text-sm p-3 rounded-xl glass">
          <Row label="Operação" value={commercial.incoterm || "—"} />
          <Row label="Moeda" value={commercial.moeda} />
          <Row label="Valor" value={commercial.valor || "—"} valueClass="text-secondary font-semibold" />
          <Row label="Liberação" value={RELEASE_STAGES.find((s) => s.value === commercial.releaseStage)?.label || "—"} />
        </div>
      </div>

      <div className="card-surface p-6">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Hash className="h-4 w-4 text-muted-foreground" /> Integrações
        </h3>
        <div className="space-y-2 text-xs">
          <IntegrationRow label="Siscomex API" status="standby" />
          <IntegrationRow label="Stellar Anchor" status="standby" />
          <IntegrationRow label="Smart Contract Settlement" status="standby" />
        </div>
      </div>

      <div className="text-[11px] text-muted-foreground flex items-start gap-2 px-2">
        <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>Ambiente demonstrativo. Nenhum pagamento real é processado nesta etapa.</span>
      </div>
    </div>
  );
}

function IntegrationRow({ label, status }: { label: string; status: "standby" | "live" }) {
  return (
    <div className="flex items-center justify-between rounded-lg px-3 py-2 bg-surface-container-low border border-border">
      <span className="text-muted-foreground">{label}</span>
      <span className={"font-mono text-[10px] uppercase tracking-widest " + (status === "live" ? "text-success" : "text-muted-foreground")}>
        {status === "live" ? "● live" : "○ standby"}
      </span>
    </div>
  );
}

/* ----------------------------- Primitives ----------------------------- */

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">{label}</div>
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={
        "w-full bg-surface-container-low border border-border rounded-lg px-3 py-2.5 text-sm outline-none transition-all " +
        "focus:border-secondary focus:ring-1 focus:ring-secondary focus:bg-surface-container " +
        className
      }
    />
  );
}

function Select({ value, onChange, options }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-surface-container-low border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-surface-container text-foreground">{o.label}</option>
      ))}
    </select>
  );
}

function Callout({ icon: Icon, children }: { icon: typeof Activity; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl bg-accent/10 border border-accent/30 text-sm flex items-start gap-3">
      <Icon className="h-4 w-4 text-accent shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

function Row({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={"truncate " + valueClass}>{value}</span>
    </div>
  );
}

function KV({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{k}</div>
      <div className={mono ? "font-mono" : ""}>{v}</div>
    </div>
  );
}

function Summary({ label, value, highlight, mono }: { label: string; value: string; highlight?: boolean; mono?: boolean }) {
  return (
    <div className="rounded-xl glass p-4">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={
        "mt-1 " +
        (highlight ? "text-secondary font-bold text-lg " : "font-semibold ") +
        (mono ? "font-mono" : "")
      }>
        {value}
      </div>
    </div>
  );
}

// Keep imports tree-shake-aware: AlertCircle is exported for future validation banners.
export { AlertCircle };

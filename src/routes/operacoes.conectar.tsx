import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText, ShieldCheck, Check, Banknote, ArrowRight, ArrowLeft, Loader2,
  QrCode, Activity, Sparkles, ClipboardCopy, FileCheck2, Globe2, Wallet,
  AlertCircle, Hash, Lock, Building2, Search, ChevronDown,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

import { useOperationStore } from "@/stores/operation.store";
import { useUserStore } from "@/stores/user.store";
import { useFeeBreakdown } from "@/hooks/use-fee-breakdown";

import { INCOTERMS, CURRENCIES, RELEASE_TRIGGERS, RELEASE_TRIGGER_LABELS, OPERATION_STATUS_META } from "@/domain/operation";
import { USER_TIER_LABELS } from "@/domain/user";

import { commercialSchema, documentationSchema } from "@/schemas/operation.schema";
import { beneficiarySchema } from "@/schemas/beneficiary.schema";
import { type UploadedFile } from "@/schemas/upload.schema";

import { formatCurrency, maskCurrencyInput, parseCurrencyInput, maskIBAN, maskSWIFT, maskDUIMP, maskInvoice } from "@/lib/formatters";
import { COUNTRIES, suggestCities } from "@/lib/countries";

import { operationsDb } from "@/services/operations.db";

import { FileDropzone } from "@/components/FileDropzone";

import type { Currency, Incoterm, ReleaseTrigger } from "@/types";

export const Route = createFileRoute("/operacoes/conectar")({
  head: () => ({ meta: [{ title: "Nova Operação — TXLOGPAY" }] }),
  component: NovaOperacao,
});

type StepIndex = 0 | 1 | 2 | 3;

const STEPS = [
  { label: "Dados Comerciais",     icon: FileText },
  { label: "Documentação",         icon: FileCheck2 },
  { label: "Dados Bancários",      icon: Banknote },
  { label: "Confirmação",          icon: ShieldCheck },
] as const;

function NovaOperacao() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<StepIndex>(0);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const tier = useUserStore((s) => s.tier);
  const setTier = useUserStore((s) => s.setTier);

  const commercial = useOperationStore((s) => s.commercial);
  const documentation = useOperationStore((s) => s.documentation);
  const beneficiary = useOperationStore((s) => s.beneficiary);
  const guarantee = useOperationStore((s) => s.guarantee);
  const current = useOperationStore((s) => s.current);

  const setCommercial = useOperationStore((s) => s.setCommercial);
  const setDocumentation = useOperationStore((s) => s.setDocumentation);
  const setBeneficiary = useOperationStore((s) => s.setBeneficiary);
  const setGuarantee = useOperationStore((s) => s.setGuarantee);
  const setEscrow = useOperationStore((s) => s.setEscrow);
  const setCurrent = useOperationStore((s) => s.setCurrent);

  const breakdown = useFeeBreakdown(commercial.operation_value);

  function validateStep(s: StepIndex): boolean {
    setErrors({});
    if (s === 0) {
      const result = commercialSchema.safeParse({
        incoterm: commercial.incoterm || undefined,
        currency: commercial.currency,
        operation_value: commercial.operation_value,
        release_trigger: commercial.release_trigger || undefined,
      });
      if (!result.success) {
        setErrors(flattenErrors(result.error));
        return false;
      }
    }
    if (s === 1) {
      const result = documentationSchema.safeParse(documentation);
      if (!result.success) {
        setErrors(flattenErrors(result.error));
        return false;
      }
    }
    if (s === 2) {
      const result = beneficiarySchema.safeParse(beneficiary);
      if (!result.success) {
        setErrors(flattenErrors(result.error));
        return false;
      }
    }
    return true;
  }

  const next = () => { if (validateStep(step)) setStep((s) => (Math.min(4, s + 1) as StepIndex)); };
  const prev = () => setStep((s) => (Math.max(0, s - 1) as StepIndex));

  async function handleActivate() {
    if (!validateStep(3)) return;
    if (!user?.id) {
      setErrors({ _: "Sessão expirada. Faça login novamente." });
      return;
    }
    setSubmitting(true);
    try {
      const op = await operationsDb.createPending({
        user_id: user.id,
        protected_amount: breakdown.gross_amount,
        fee_amount: breakdown.fee_amount + breakdown.custody_fee + breakdown.settlement_fee,
        total_amount: breakdown.total_funding,
        currency: commercial.currency,
        incoterm: commercial.incoterm as Incoterm,
        release_trigger: commercial.release_trigger as ReleaseTrigger,
        exporter_name: beneficiary.exporter_name,
        importer_name: user.user_metadata?.full_name || user.email || null,
        bank_name: beneficiary.bank_name,
        swift: beneficiary.swift,
        iban: beneficiary.iban,
        beneficiary_country: beneficiary.country,
        beneficiary_city: beneficiary.city,
        invoice_number: documentation.invoice_number,
        bl_awb: documentation.bl_awb,
        duimp: documentation.duimp,
        siscomex_reference: documentation.siscomex_reference,
      });
      navigate({ to: "/operacoes/$id/pagamento", params: { id: op.id } });
    } catch (e) {
      console.error(e);
      setErrors({ _: (e as Error).message });
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
        <div className="flex items-center gap-2">
          <TierSelector value={tier} onChange={setTier} />
          <span className="chip chip-cargo text-[11px]">
            <ShieldCheck className="h-3.5 w-3.5" />Trade finance enterprise
          </span>
        </div>
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
              {step === 0 && <Step1Commercial errors={errors} />}
              {step === 1 && <Step2Documents errors={errors} />}
              {step === 2 && <Step3Bank errors={errors} />}
              {step === 3 && <Step4Guarantee />}
            </motion.div>
          </AnimatePresence>

          {errors._ && <div className="mt-3 text-xs text-destructive">{errors._}</div>}

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
                className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold"
              >
                Continuar <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleActivate}
                disabled={submitting}
                className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Registrando...</> : <><ShieldCheck className="h-4 w-4" /> Confirmar e Pagar</>}
              </button>
            )}
          </div>
        </div>

        <SidePanel
          step={step}
          breakdown={breakdown}
          currency={commercial.currency}
          tier={tier}
        />
      </div>
    </AppShell>
  );
}

function flattenErrors(err: import("zod").ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const k = issue.path.join(".") || "_";
    if (!out[k]) out[k] = issue.message;
  }
  return out;
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

function Step1Commercial({ errors }: { errors: Record<string, string> }) {
  const commercial = useOperationStore((s) => s.commercial);
  const setCommercial = useOperationStore((s) => s.setCommercial);

  return (
    <div className="card-surface p-6 space-y-6">
      <header>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <FileText className="h-4 w-4 text-secondary" /> Dados Comerciais
        </h2>
        <p className="text-xs text-muted-foreground mt-1">Termos da operação internacional já registrada no Siscomex.</p>
      </header>

      <div className="grid md:grid-cols-2 gap-5">
        <Field label="Incoterm" error={errors.incoterm}>
          <Select
            value={commercial.incoterm}
            onChange={(v) => setCommercial({ incoterm: v as Incoterm | "" })}
            options={[{ value: "", label: "Selecione..." }, ...INCOTERMS.map((i) => ({ value: i, label: i }))]}
          />
        </Field>

        <Field label="Moeda" error={errors.currency}>
          <Select
            value={commercial.currency}
            onChange={(v) => setCommercial({ currency: v as Currency })}
            options={CURRENCIES.map((c) => ({ value: c, label: c }))}
          />
        </Field>

        <Field label="Valor da operação" className="md:col-span-2" error={errors.operation_value}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">{commercial.currency}</span>
            <Input
              className="pl-14 text-lg font-semibold font-mono"
              placeholder="0.00"
              inputMode="decimal"
              value={commercial.operation_value_input}
              onChange={(e) => {
                const masked = maskCurrencyInput(e.target.value);
                setCommercial({
                  operation_value_input: masked,
                  operation_value: parseCurrencyInput(masked),
                });
              }}
            />
          </div>
          {commercial.operation_value > 0 && (
            <div className="mt-1.5 text-[11px] font-mono text-muted-foreground">
              {formatCurrency(commercial.operation_value, commercial.currency)}
            </div>
          )}
        </Field>
      </div>

      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
          Trigger de liberação automática
        </div>
        <div className="grid sm:grid-cols-2 gap-2.5">
          {RELEASE_TRIGGERS.map((trg) => {
            const meta = RELEASE_TRIGGER_LABELS[trg];
            const active = commercial.release_trigger === trg;
            return (
              <button
                key={trg}
                type="button"
                onClick={() => setCommercial({ release_trigger: trg })}
                className={
                  "text-left rounded-xl px-4 py-3 border transition-all " +
                  (active
                    ? "border-secondary bg-secondary/10 ring-1 ring-secondary shadow-[0_0_20px_oklch(0.85_0.18_200/0.25)]"
                    : "border-border hover:border-secondary/50 hover:bg-surface-container")
                }
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{meta.label}</span>
                  <span className="font-mono text-[9px] text-muted-foreground">{trg}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{meta.desc}</div>
              </button>
            );
          })}
        </div>
        {errors.release_trigger && <ErrorMsg msg={errors.release_trigger} />}
      </div>

      <Callout icon={Activity}>
        O pagamento será liberado automaticamente quando o evento operacional selecionado for confirmado via Siscomex.
      </Callout>
    </div>
  );
}

/* ----------------------------- Step 2: Documents ----------------------------- */

function Step2Documents({ errors }: { errors: Record<string, string> }) {
  const documentation = useOperationStore((s) => s.documentation);
  const setDocumentation = useOperationStore((s) => s.setDocumentation);
  const [invoiceFile, setInvoiceFile] = useState<UploadedFile | undefined>();
  const [packingFile, setPackingFile] = useState<UploadedFile | undefined>();
  const [blFile, setBlFile] = useState<UploadedFile | undefined>();

  return (
    <div className="card-surface p-6 space-y-6">
      <header>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <FileCheck2 className="h-4 w-4 text-secondary" /> Documentação Operacional
        </h2>
        <p className="text-xs text-muted-foreground mt-1">Documentos vinculados ao processo Siscomex.</p>
      </header>

      <div className="grid md:grid-cols-2 gap-5">
        <Field label="Número da Invoice" error={errors.invoice_number}>
          <Input
            value={documentation.invoice_number}
            onChange={(e) => setDocumentation({ invoice_number: maskInvoice(e.target.value) })}
            placeholder="INV-2024-XXXXX"
            className="font-mono"
          />
        </Field>
        <Field label="Bill of Lading / AWB" error={errors.bl_awb}>
          <Input
            value={documentation.bl_awb}
            onChange={(e) => setDocumentation({ bl_awb: e.target.value.toUpperCase() })}
            placeholder="HLCUBSC..."
            className="font-mono"
          />
        </Field>
        <Field label="Número DUIMP" error={errors.duimp}>
          <Input
            value={documentation.duimp}
            onChange={(e) => setDocumentation({ duimp: maskDUIMP(e.target.value) })}
            placeholder="24/0000000-0"
            className="font-mono"
          />
        </Field>
        <Field label="Referência Siscomex" error={errors.siscomex_reference}>
          <Input
            value={documentation.siscomex_reference}
            onChange={(e) => setDocumentation({ siscomex_reference: e.target.value })}
            placeholder="SISCOMEX-..."
            className="font-mono"
          />
        </Field>
      </div>

      <div className="space-y-3">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Anexos</div>
        <div className="grid md:grid-cols-3 gap-3">
          <FileDropzone label="Invoice" value={invoiceFile} onChange={setInvoiceFile} />
          <FileDropzone label="Packing List" value={packingFile} onChange={setPackingFile} />
          <FileDropzone label="BL / AWB" value={blFile} onChange={setBlFile} />
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Step 3: Bank ----------------------------- */

function Step3Bank({ errors }: { errors: Record<string, string> }) {
  const beneficiary = useOperationStore((s) => s.beneficiary);
  const setBeneficiary = useOperationStore((s) => s.setBeneficiary);
  const cityHints = useMemo(() => suggestCities(beneficiary.country), [beneficiary.country]);

  return (
    <div className="card-surface p-6 space-y-6">
      <header>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Banknote className="h-4 w-4 text-secondary" /> Dados Bancários do Exportador
        </h2>
        <p className="text-xs text-muted-foreground mt-1">Beneficiário internacional da liquidação automática.</p>
      </header>

      <div className="grid md:grid-cols-2 gap-5">
        <Field label="Nome do exportador" className="md:col-span-2" error={errors.exporter_name}>
          <Input value={beneficiary.exporter_name} onChange={(e) => setBeneficiary({ exporter_name: e.target.value })} placeholder="Acme Industries Ltd." />
        </Field>
        <Field label="Banco" error={errors.bank_name}>
          <Input value={beneficiary.bank_name} onChange={(e) => setBeneficiary({ bank_name: e.target.value })} placeholder="HSBC Hong Kong" />
        </Field>
        <Field label="SWIFT / BIC" error={errors.swift}>
          <Input
            value={beneficiary.swift}
            onChange={(e) => setBeneficiary({ swift: maskSWIFT(e.target.value) })}
            placeholder="HSBCHKHHHKH"
            className="font-mono uppercase"
          />
        </Field>
        <Field label="IBAN / Conta" error={errors.iban}>
          <Input
            value={beneficiary.iban}
            onChange={(e) => setBeneficiary({ iban: maskIBAN(e.target.value) })}
            placeholder="HK00 0000 0000 0000"
            className="font-mono"
          />
        </Field>
        <Field label="Beneficiário" error={errors.beneficiary_name}>
          <Input value={beneficiary.beneficiary_name} onChange={(e) => setBeneficiary({ beneficiary_name: e.target.value })} placeholder="Nome do beneficiário" />
        </Field>
        <Field label="País" error={errors.country}>
          <CountryCombobox value={beneficiary.country} onChange={(v) => setBeneficiary({ country: v, city: "" })} />
        </Field>
        <Field label="Cidade" error={errors.city}>
          <Input
            value={beneficiary.city}
            onChange={(e) => setBeneficiary({ city: e.target.value })}
            placeholder="Cidade"
            list="city-hints"
          />
          <datalist id="city-hints">
            {cityHints.map((c) => <option key={c} value={c} />)}
          </datalist>
        </Field>
      </div>
    </div>
  );
}

function CountryCombobox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => COUNTRIES.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full bg-surface-container-low border border-border rounded-lg px-3 py-2.5 text-sm flex items-center justify-between hover:border-secondary/50"
      >
        <span className={value ? "" : "text-muted-foreground"}>{value || "Selecione um país"}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-surface-container shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar país..."
              className="bg-transparent outline-none text-sm w-full"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto">
            {filtered.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => { onChange(c.name); setOpen(false); setQuery(""); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-surface-container-low flex items-center justify-between"
                >
                  <span>{c.name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{c.code}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-xs text-muted-foreground">Nenhum país encontrado</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ----------------------------- Step 4: Guarantee ----------------------------- */

function Step4Guarantee() {
  const guarantee = useOperationStore((s) => s.guarantee);
  const setGuarantee = useOperationStore((s) => s.setGuarantee);
  const commercial = useOperationStore((s) => s.commercial);

  const pixPayload = useMemo(
    () => `00020126TXLOGPAY${(commercial.incoterm || "OP").slice(0, 8)}520400005303986540${commercial.operation_value.toFixed(2)}5802BR6009SAO PAULO6304ABCD`,
    [commercial.operation_value, commercial.incoterm],
  );

  const methods = [
    { id: "pix"   as const, label: "PIX",                    icon: QrCode,  hint: "Instantâneo · BRL" },
    { id: "ted"   as const, label: "Transferência bancária", icon: Wallet,  hint: "Doméstica · 1h" },
    { id: "swift" as const, label: "SWIFT internacional",    icon: Globe2,  hint: "Cross-border · 12-24h" },
  ];

  return (
    <div className="card-surface p-6 space-y-6">
      <header>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ShieldCheck className="h-4 w-4 text-secondary" /> Garantia Operacional
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Reserva financeira vinculada à operação. Liberada automaticamente após o evento aduaneiro selecionado.
        </p>
      </header>

      <div className="grid sm:grid-cols-3 gap-2.5">
        {methods.map((m) => {
          const active = guarantee.method === m.id;
          const Icon = m.icon;
          return (
            <button key={m.id} type="button" onClick={() => setGuarantee({ method: m.id })}
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

      {guarantee.method === "pix" ? (
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
          <div className="rounded-xl glass p-5 space-y-3 text-sm">
            <div className="font-semibold flex items-center gap-2">
              <Lock className="h-4 w-4 text-secondary" /> Aguardando confirmação
            </div>
            <p className="text-xs text-muted-foreground">
              Assim que o depósito for confirmado, a operação avança para análise e iniciamos o monitoramento dos eventos aduaneiros.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          <div className="rounded-xl glass p-5 space-y-3 text-sm">
            <div className="font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-secondary" /> Dados para {guarantee.method === "ted" ? "TED" : "SWIFT"}
            </div>
            <KV k="Banco parceiro" v="Standard Chartered (Global)" />
            <KV k="SWIFT / BIC" v="TXLPBRSPXXX" mono />
            <KV k="Conta operacional" v="8829-00129-2192-0" mono />
            <div className="p-3 rounded-lg bg-surface-container-low text-xs text-muted-foreground">
              Tempo estimado: {guarantee.method === "ted" ? "até 1h útil" : "12-24h úteis"} para conciliação.
            </div>
          </div>
          <div className="rounded-xl glass p-5 space-y-3 text-sm">
            <div className="font-semibold flex items-center gap-2">
              <Lock className="h-4 w-4 text-secondary" /> Garantia operacional protegida
            </div>
            <p className="text-xs text-muted-foreground">
              Os fundos ficam retidos em conta segregada e são liberados ao exportador na confirmação do evento operacional acordado.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function PixQR({ seed }: { seed: string }) {
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
    <div className="grid gap-[2px]" style={{ gridTemplateColumns: "repeat(13, 1fr)" }}>
      {cells.map((on, i) => (
        <span key={i} className={"h-2.5 w-2.5 rounded-[1px] " + (on ? "bg-foreground" : "bg-transparent")} />
      ))}
    </div>
  );
}

/* Step 5 removed — flow now redirects to /operacoes/$id/pagamento */

/* ----------------------------- Side panel ----------------------------- */

function SidePanel({
  step, breakdown, currency, tier,
}: {
  step: StepIndex;
  breakdown: ReturnType<typeof useFeeBreakdown>;
  currency: Currency;
  tier: import("@/domain/user").UserTier;
}) {
  const titles = [
    "Estrutura financeira",
    "Documentação Siscomex",
    "Liquidação internacional",
    "Custódia digital",
    "Operação em monitoramento",
  ] as const;

  return (
    <div className="space-y-5">
      <div className="card-surface p-6 ring-1 ring-secondary/30">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-secondary" /> {titles[step]}
        </h3>
        <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mt-1">
          Tier {USER_TIER_LABELS[tier]} · {(breakdown.effective_rate * 100).toFixed(2)}% efetivo
        </p>

        <div className="mt-4 space-y-2 text-sm p-3 rounded-xl glass">
          <BreakdownRow label="Valor protegido" value={formatCurrency(breakdown.gross_amount, currency)} />
          <BreakdownRow label="Fee operacional" value={formatCurrency(breakdown.fee_amount, currency)} />
          <BreakdownRow label="Taxa de custódia" value={formatCurrency(breakdown.custody_fee, currency)} />
          <BreakdownRow label="Taxa de liquidação" value={formatCurrency(breakdown.settlement_fee, currency)} />
          <div className="h-px bg-border my-1" />
          <BreakdownRow
            label="Total da garantia"
            value={formatCurrency(breakdown.total_funding, currency)}
            highlight
          />
          <div className="text-[10px] font-mono text-muted-foreground pt-1">
            Líquido ao exportador: {formatCurrency(breakdown.net_exporter_amount, currency)}
          </div>
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
          <IntegrationRow label="Supabase Cloud" status="standby" />
        </div>
      </div>

      <div className="text-[11px] text-muted-foreground flex items-start gap-2 px-2">
        <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>Ambiente demonstrativo. Nenhum pagamento real é processado nesta etapa.</span>
      </div>
    </div>
  );
}

function BreakdownRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className={highlight ? "text-foreground font-semibold" : "text-muted-foreground"}>{label}</span>
      <span className={"font-mono " + (highlight ? "text-secondary font-bold text-sm" : "text-foreground")}>{value}</span>
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

function TierSelector({ value, onChange }: { value: import("@/domain/user").UserTier; onChange: (t: import("@/domain/user").UserTier) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as import("@/domain/user").UserTier)}
      className="bg-surface-container-low border border-border rounded-lg px-3 py-2 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground"
      title="Demo: simular tier do usuário"
    >
      {(["STANDARD","ENTERPRISE","VIP","ANCHOR_PARTNER"] as const).map((t) => (
        <option key={t} value={t}>Tier · {USER_TIER_LABELS[t]}</option>
      ))}
    </select>
  );
}

/* ----------------------------- Primitives ----------------------------- */

function StatusBadge({ label, tone }: { label: string; tone: "muted" | "warning" | "info" | "success" | "primary" }) {
  const map: Record<typeof tone, string> = {
    muted:   "chip-info",
    info:    "chip-info",
    warning: "chip-warning",
    success: "chip-success",
    primary: "chip-cargo",
  };
  return <span className={"chip " + map[tone] + " text-[10px] ml-1"}>{label}</span>;
}

function Field({ label, className = "", error, children }: { label: string; className?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">{label}</div>
      {children}
      {error && <ErrorMsg msg={error} />}
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-destructive">
      <AlertCircle className="h-3 w-3" /> {msg}
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

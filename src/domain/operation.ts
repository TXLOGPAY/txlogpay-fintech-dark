// Domain enums + labels for operations. Single source of truth for UI badges,
// state machine transitions and future Supabase mappings.

export const INCOTERMS = [
  "EXW","FCA","FOB","CFR","CIF","CPT","CIP","DAP","DPU","DDP",
] as const;
export type Incoterm = typeof INCOTERMS[number];

export const CURRENCIES = ["USD","EUR","BRL","CNY","GBP"] as const;
export type Currency = typeof CURRENCIES[number];

// Release trigger — which aduaneiro event releases the payment
export const RELEASE_TRIGGERS = [
  "CREATED",
  "EXPORTER_ACCEPTED",
  "CARGO_SHIPPED",
  "IN_TRANSIT",
  "CUSTOMS_ARRIVAL",
  "CUSTOMS_RELEASED",
] as const;
export type ReleaseTrigger = typeof RELEASE_TRIGGERS[number];

export const RELEASE_TRIGGER_LABELS: Record<ReleaseTrigger, { label: string; desc: string }> = {
  CREATED:           { label: "Criada",            desc: "Operação registrada pelo importador" },
  EXPORTER_ACCEPTED: { label: "Aceita",            desc: "Exportador confirmou os termos" },
  CARGO_SHIPPED:     { label: "Embarque",          desc: "Carga embarcada na origem" },
  IN_TRANSIT:        { label: "Em trânsito",       desc: "Carga em trânsito internacional" },
  CUSTOMS_ARRIVAL:   { label: "Chegada alfândega", desc: "Carga chegou ao porto de destino" },
  CUSTOMS_RELEASED:  { label: "Desembaraço",       desc: "Liberação aduaneira concluída" },
};

// 8-stage operation status state machine
export const OPERATION_STATUSES = [
  "DRAFT",
  "PENDING_FUNDING",
  "UNDER_REVIEW",
  "FUNDED",
  "MONITORING",
  "TRIGGER_MATCHED",
  "SETTLEMENT_PENDING",
  "SETTLED",
] as const;
export type OperationStatus = typeof OPERATION_STATUSES[number];

export const OPERATION_STATUS_META: Record<OperationStatus, {
  label: string; tone: "muted" | "warning" | "info" | "success" | "primary";
}> = {
  DRAFT:              { label: "Rascunho",                 tone: "muted" },
  PENDING_FUNDING:    { label: "Aguardando garantia",      tone: "warning" },
  UNDER_REVIEW:       { label: "Em análise",               tone: "info" },
  FUNDED:             { label: "Garantia confirmada",      tone: "primary" },
  MONITORING:         { label: "Em monitoramento",         tone: "info" },
  TRIGGER_MATCHED:    { label: "Evento confirmado",        tone: "primary" },
  SETTLEMENT_PENDING: { label: "Liquidação em curso",      tone: "warning" },
  SETTLED:            { label: "Liquidada",                tone: "success" },
};

export type EventSource = "SISCOMEX" | "USER" | "TXLOGPAY" | "ANCHOR";

export const EVENT_SOURCE_LABELS: Record<EventSource, string> = {
  SISCOMEX: "Siscomex API",
  USER:     "Usuário",
  TXLOGPAY: "TXLOGPAY",
  ANCHOR:   "Stellar Anchor",
};

// Next-status transition table driven by trigger events.
export function nextStatus(
  current: OperationStatus,
  evt:
    | "FUNDING_RECEIVED"
    | "REVIEW_APPROVED"
    | "MONITORING_STARTED"
    | "TRIGGER_MATCHED"
    | "SETTLEMENT_INITIATED"
    | "SETTLEMENT_CONFIRMED",
): OperationStatus {
  const table: Record<OperationStatus, Partial<Record<typeof evt, OperationStatus>>> = {
    DRAFT:              { FUNDING_RECEIVED: "PENDING_FUNDING" },
    PENDING_FUNDING:    { REVIEW_APPROVED: "UNDER_REVIEW" },
    UNDER_REVIEW:       { MONITORING_STARTED: "FUNDED" },
    FUNDED:             { MONITORING_STARTED: "MONITORING" },
    MONITORING:         { TRIGGER_MATCHED: "TRIGGER_MATCHED" },
    TRIGGER_MATCHED:    { SETTLEMENT_INITIATED: "SETTLEMENT_PENDING" },
    SETTLEMENT_PENDING: { SETTLEMENT_CONFIRMED: "SETTLED" },
    SETTLED:            {},
  };
  return table[current][evt] ?? current;
}

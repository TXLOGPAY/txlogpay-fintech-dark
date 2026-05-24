// Operation lifecycle status — single source of truth for labels, tones
// and grouping. Mirrors the Supabase `operation_status` enum.

export const OPERATION_STATUS = [
  "PENDING_PAYMENT",
  "PAYMENT_UNDER_REVIEW",
  "OPERATION_MONITORING",
  "PAYMENT_RELEASED",
  "ACTIVE",        // legacy: still treated as monitoring
  "COMPLETED",
  "CANCELLED",
] as const;
export type OperationStatus = typeof OPERATION_STATUS[number];

export const STATUS_META: Record<OperationStatus, { label: string; chip: string; color: string }> = {
  PENDING_PAYMENT:      { label: "Aguardando pagamento",   chip: "chip-warning", color: "var(--warning)" },
  PAYMENT_UNDER_REVIEW: { label: "Pagamento em análise",   chip: "chip-info",    color: "var(--accent)" },
  OPERATION_MONITORING: { label: "Operação monitorada",    chip: "chip-info",    color: "var(--secondary)" },
  PAYMENT_RELEASED:     { label: "Pagamento liberado",     chip: "chip-success", color: "var(--success)" },
  ACTIVE:               { label: "Operação ativa",         chip: "chip-info",    color: "var(--secondary)" },
  COMPLETED:            { label: "Concluída",              chip: "chip-success", color: "var(--success)" },
  CANCELLED:            { label: "Cancelada",              chip: "chip-warning", color: "var(--destructive)" },
};

// Statuses considered "post-payment" (operation already locked in).
export const ACTIVE_STATUSES: OperationStatus[] = [
  "OPERATION_MONITORING", "PAYMENT_RELEASED", "ACTIVE", "COMPLETED",
];

export const isActive = (s: string) => ACTIVE_STATUSES.includes(s as OperationStatus);
export const isPending = (s: string) => s === "PENDING_PAYMENT";
export const isUnderReview = (s: string) => s === "PAYMENT_UNDER_REVIEW";

export const RESERVATION_STATUSES = ["PENDING", "RESERVED", "MONITORING", "RELEASED"] as const;
export type ReservationStatus = typeof RESERVATION_STATUSES[number];

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  PENDING:    "Pendente",
  RESERVED:   "Reservada",
  MONITORING: "Monitorando",
  RELEASED:   "Liberada",
};

export const PAYMENT_VALIDATION_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type PaymentValidationStatus = typeof PAYMENT_VALIDATION_STATUSES[number];

export const ANCHOR_PROVIDERS = ["STELLAR_TXLP", "STELLAR_CIRCLE", "MANUAL"] as const;
export type AnchorProvider = typeof ANCHOR_PROVIDERS[number];

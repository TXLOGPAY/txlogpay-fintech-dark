// Escrow Service — creates EscrowReservation records and drives their status
// through PENDING → RESERVED → MONITORING → RELEASED.

import type { EscrowReservation, Operation } from "@/types";
import type { UserTier } from "@/domain/user";
import type { ReservationStatus, AnchorProvider } from "@/domain/escrow";
import { feeEngine } from "./fee-engine.service";

function uid() {
  return `esc_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export interface CreateReservationInput {
  operation_id: string;
  gross_amount: number;
  currency: Operation["currency"];
  tier: UserTier;
  anchor_provider?: AnchorProvider;
}

export const escrowService = {
  create(input: CreateReservationInput): EscrowReservation {
    const breakdown = feeEngine.calculateBreakdown(input.gross_amount, input.tier);
    return {
      id: uid(),
      operation_id: input.operation_id,
      currency: input.currency,
      anchor_provider: input.anchor_provider ?? "STELLAR_TXLP",
      reservation_status: "PENDING",
      created_at: new Date().toISOString(),
      ...breakdown,
    };
  },

  transition(reservation: EscrowReservation, to: ReservationStatus): EscrowReservation {
    return { ...reservation, reservation_status: to };
  },
};

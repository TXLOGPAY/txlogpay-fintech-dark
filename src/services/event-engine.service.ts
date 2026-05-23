// Event Engine — central registrar for OperationEvents and status transitions.
// Stateless: receives the current operation and returns the updated copy.

import type { Operation, OperationEvent } from "@/types";
import type { EventSource, OperationStatus } from "@/domain/operation";
import { nextStatus } from "@/domain/operation";

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export type TransitionEvent =
  | "FUNDING_RECEIVED"
  | "REVIEW_APPROVED"
  | "MONITORING_STARTED"
  | "TRIGGER_MATCHED"
  | "SETTLEMENT_INITIATED"
  | "SETTLEMENT_CONFIRMED";

export interface RecordEventInput {
  event_type: string;
  description: string;
  source: EventSource;
  transition?: TransitionEvent;
}

export const eventEngine = {
  buildEvent(operationId: string, input: RecordEventInput): OperationEvent {
    return {
      id: uid("ev"),
      operation_id: operationId,
      event_type: input.event_type,
      description: input.description,
      source: input.source,
      timestamp: new Date().toISOString(),
    };
  },

  /** Append an event and (optionally) transition the operation status. */
  apply(op: Operation, input: RecordEventInput): Operation {
    const event = this.buildEvent(op.id, input);
    const status: OperationStatus = input.transition
      ? nextStatus(op.status, input.transition)
      : op.status;
    return {
      ...op,
      status,
      events: [...op.events, event],
    };
  },

  /** Bootstrap timeline for a freshly created operation (DRAFT → PENDING_FUNDING). */
  bootstrap(op: Operation): Operation {
    const e1 = this.buildEvent(op.id, {
      event_type: "OPERATION_REGISTERED",
      description: "Operação registrada e validada no Siscomex",
      source: "USER",
    });
    const e2 = this.buildEvent(op.id, {
      event_type: "GUARANTEE_REQUESTED",
      description: "Garantia operacional aguardando depósito",
      source: "TXLOGPAY",
    });
    return { ...op, events: [...op.events, e1, e2] };
  },
};

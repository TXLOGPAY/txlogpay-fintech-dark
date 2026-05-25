// Supabase-backed operations service. Single source of truth for the
// real operational data (no mocks). Uses RLS — every query is scoped to
// the authenticated user automatically.

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { ACTIVE_STATUSES } from "@/domain/operation-status";
import { getUsdRate } from "@/services/fx.service";
import { getProtectedAmount } from "@/lib/financial-calculations";

export type DBOperation = Database["public"]["Tables"]["operations"]["Row"] & {
  operation_currency?: string | null;
  operation_value?: number | null;
  total_fees?: number | null;
  usd_conversion_rate?: number | null;
  usd_normalized_value?: number | null;
  fx_reference_date?: string | null;
};
export type DBOperationInsert = Database["public"]["Tables"]["operations"]["Insert"];
export type DBOperationUpdate = Database["public"]["Tables"]["operations"]["Update"];
export type DBOperationStatus = Database["public"]["Enums"]["operation_status"];

function makeOperationCode() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `TX-${n}`;
}

// Only fields that actually exist on the operations table.
// Anything not in this list is silently dropped before insert/update.
const ALLOWED_COLUMNS = [
  "id", "user_id", "operation_code", "status",
  "operation_value", "total_fees", "protected_amount", "fee_amount", "total_amount", "currency",
  "incoterm", "release_trigger",
  "exporter_name", "importer_name",
  "bank_name", "swift", "iban",
  "beneficiary_country", "beneficiary_city",
  "invoice_number", "bl_awb", "duimp", "siscomex_reference",
  "payment_proof_url",
  "payment_receipt_url", "payment_receipt_name", "payment_submitted_at",
  "activated_at", "created_at", "updated_at",
  // FX normalisation columns
  "operation_currency", "usd_conversion_rate", "usd_normalized_value", "fx_reference_date",
  "fx_currency_used", "fx_rate_to_usd",
  // SISCOMEX operational status (distinct from macro `status`)
  "current_operational_status",
  // Stellar wallet
  "operation_wallet",
] as const;

function pickAllowed<T extends Record<string, unknown>>(input: T): Partial<DBOperationInsert> {
  const out: Record<string, unknown> = {};
  for (const k of ALLOWED_COLUMNS) {
    if (k in input && (input as Record<string, unknown>)[k as string] !== undefined) {
      out[k as string] = (input as Record<string, unknown>)[k as string];
    }
  }
  return out as Partial<DBOperationInsert>;
}

export const operationsDb = {
  async list(): Promise<DBOperation[]> {
    const { data, error } = await supabase
      .from("operations")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async listActive(): Promise<DBOperation[]> {
    const { data, error } = await supabase
      .from("operations")
      .select("*")
      .in("status", ACTIVE_STATUSES)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async get(id: string): Promise<DBOperation | null> {
    const { data, error } = await supabase
      .from("operations")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async createPending(
    input: Omit<DBOperationInsert, "operation_code" | "status"> & Record<string, unknown>,
  ): Promise<DBOperation> {
    const safe = pickAllowed(input) as Record<string, unknown>;

    // Regra financeira oficial:
    //   protected_amount  = operation_value (garantia = valor da carga)
    //   total_amount      = operation_value + total_fees (total a pagar)
    //   fee_amount        = receita TXLOGPAY, NÃO compõe garantia
    const currency = String(safe.currency ?? input.currency ?? "USD").toUpperCase();
    const operationValue = Number(safe.operation_value ?? input.operation_value ?? input.protected_amount ?? 0);
    const totalFees = Number(safe.total_fees ?? input.total_fees ?? input.fee_amount ?? 0);
    safe.operation_value = operationValue;
    safe.total_fees = totalFees;
    safe.fee_amount = safe.fee_amount ?? totalFees;
    safe.protected_amount = operationValue;
    safe.total_amount = operationValue + totalFees;

    // FX audit snapshot — preserva contexto cambial original (não recalcular retroativamente).
    const quote = await getUsdRate(currency);
    safe.operation_currency = currency;
    safe.usd_conversion_rate = quote.rate;
    safe.usd_normalized_value = operationValue * quote.rate;
    safe.fx_reference_date = quote.reference_date;
    safe.fx_currency_used = currency;
    safe.fx_rate_to_usd = quote.rate;

    const payload = {
      ...safe,
      operation_code: makeOperationCode(),
      status: "PENDING_PAYMENT" as DBOperationStatus,
    } as DBOperationInsert;
    const { data, error } = await supabase
      .from("operations")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, patch: Partial<DBOperationInsert> & Record<string, unknown>): Promise<DBOperation> {
    const safe = pickAllowed(patch);
    const { data, error } = await supabase
      .from("operations")
      .update(safe as DBOperationUpdate)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  /** Marks a receipt as submitted and flips the status to under review. */
  async submitReceipt(id: string, fileUrl: string, fileName: string): Promise<DBOperation> {
    return this.update(id, {
      payment_receipt_url: fileUrl,
      payment_receipt_name: fileName,
      payment_submitted_at: new Date().toISOString(),
      status: "PAYMENT_UNDER_REVIEW",
    });
  },

  /** Admin / hackathon: validate the receipt → operation enters monitoring. */
  async validatePayment(id: string): Promise<DBOperation> {
    return this.update(id, {
      status: "OPERATION_MONITORING",
      activated_at: new Date().toISOString(),
    });
  },

  /** Kept for backward compatibility — same effect as validatePayment. */
  async markActive(id: string): Promise<DBOperation> {
    return this.validatePayment(id);
  },

  async uploadReceipt(userId: string, operationId: string, file: File): Promise<string> {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${userId}/${operationId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("payment-receipts")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    return path;
  },

  // Legacy alias
  async uploadProof(userId: string, operationId: string, file: File): Promise<string> {
    return this.uploadReceipt(userId, operationId, file);
  },

  async getReceiptUrl(path: string): Promise<string | null> {
    const { data, error } = await supabase.storage
      .from("payment-receipts")
      .createSignedUrl(path, 60 * 60);
    if (error) return null;
    return data?.signedUrl ?? null;
  },
};

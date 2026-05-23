import { z } from "zod";
import { INCOTERMS, CURRENCIES, RELEASE_TRIGGERS } from "@/domain/operation";

export const incotermSchema = z.enum(INCOTERMS);
export const currencySchema = z.enum(CURRENCIES);
export const releaseTriggerSchema = z.enum(RELEASE_TRIGGERS);

export const operationValueSchema = z
  .number({ invalid_type_error: "Informe um valor numérico" })
  .positive("O valor deve ser maior que zero")
  .max(100_000_000, "Valor acima do limite operacional (US$ 100M)");

export const commercialSchema = z.object({
  incoterm: incotermSchema,
  currency: currencySchema,
  operation_value: operationValueSchema,
  release_trigger: releaseTriggerSchema,
});

export const documentationSchema = z.object({
  invoice_number: z.string().trim().min(2, "Informe o número da invoice").max(80),
  bl_awb: z.string().trim().min(3, "Informe BL/AWB").max(80),
  duimp: z.string().trim().regex(/^\d{2}\/\d{7}-\d$/, "Formato DUIMP esperado: 24/0000000-0"),
  siscomex_reference: z.string().trim().min(3, "Informe a referência Siscomex").max(80),
});

export type CommercialInput = z.infer<typeof commercialSchema>;
export type DocumentationInput = z.infer<typeof documentationSchema>;

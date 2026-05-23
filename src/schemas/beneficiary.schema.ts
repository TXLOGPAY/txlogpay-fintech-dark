import { z } from "zod";

// SWIFT/BIC — 8 or 11 chars, country code in positions 5-6
export const swiftSchema = z
  .string()
  .trim()
  .transform((s) => s.toUpperCase().replace(/\s+/g, ""))
  .pipe(
    z.string().regex(
      /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
      "SWIFT/BIC inválido (use 8 ou 11 caracteres)",
    ),
  );

// IBAN — 2-letter country, 2 check digits, up to 30 alphanumeric
export const ibanSchema = z
  .string()
  .trim()
  .transform((s) => s.toUpperCase().replace(/\s+/g, ""))
  .pipe(
    z.string()
      .min(15, "IBAN muito curto")
      .max(34, "IBAN muito longo")
      .regex(/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/, "Formato de IBAN inválido"),
  );

export const beneficiarySchema = z.object({
  exporter_name: z.string().trim().min(2, "Informe o nome do exportador").max(200),
  bank_name: z.string().trim().min(2, "Informe o banco").max(200),
  swift: swiftSchema,
  iban: ibanSchema,
  beneficiary_name: z.string().trim().min(2, "Informe o beneficiário").max(200),
  country: z.string().trim().min(2, "Selecione um país").max(100),
  city: z.string().trim().min(2, "Informe a cidade").max(100),
});

export type BeneficiaryInput = z.infer<typeof beneficiarySchema>;

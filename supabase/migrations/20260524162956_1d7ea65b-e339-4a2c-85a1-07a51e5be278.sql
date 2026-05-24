ALTER TABLE public.operations
  ADD COLUMN IF NOT EXISTS operation_currency text,
  ADD COLUMN IF NOT EXISTS usd_conversion_rate numeric,
  ADD COLUMN IF NOT EXISTS usd_normalized_value numeric,
  ADD COLUMN IF NOT EXISTS fx_reference_date timestamp with time zone;

-- Backfill existing rows using static FX reference (USD=1, EUR=1.08, GBP=1.27, BRL=0.18, CNY=0.14)
UPDATE public.operations
SET
  operation_currency = COALESCE(operation_currency, currency),
  usd_conversion_rate = COALESCE(usd_conversion_rate, CASE upper(currency)
    WHEN 'USD' THEN 1
    WHEN 'EUR' THEN 1.08
    WHEN 'GBP' THEN 1.27
    WHEN 'BRL' THEN 0.18
    WHEN 'CNY' THEN 0.14
    ELSE 1
  END),
  fx_reference_date = COALESCE(fx_reference_date, created_at)
WHERE usd_conversion_rate IS NULL OR operation_currency IS NULL;

UPDATE public.operations
SET usd_normalized_value = COALESCE(usd_normalized_value, protected_amount * usd_conversion_rate)
WHERE usd_normalized_value IS NULL;
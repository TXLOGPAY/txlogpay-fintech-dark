
ALTER TABLE public.settlements
  ADD COLUMN IF NOT EXISTS source_wallet text,
  ADD COLUMN IF NOT EXISTS confirmation_code text,
  ADD COLUMN IF NOT EXISTS operation_currency text,
  ADD COLUMN IF NOT EXISTS asset_code text;

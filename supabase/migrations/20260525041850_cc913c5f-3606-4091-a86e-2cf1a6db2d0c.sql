ALTER TABLE public.operations
ADD COLUMN IF NOT EXISTS current_operational_status text;
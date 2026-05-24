
-- Expand operation_status enum (recreate to allow safe addition in one migration)
ALTER TABLE public.operations ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.operations ALTER COLUMN status TYPE text USING status::text;
DROP TYPE public.operation_status;
CREATE TYPE public.operation_status AS ENUM (
  'PENDING_PAYMENT',
  'PAYMENT_UNDER_REVIEW',
  'OPERATION_MONITORING',
  'PAYMENT_RELEASED',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED'
);
ALTER TABLE public.operations
  ALTER COLUMN status TYPE public.operation_status USING status::public.operation_status;
ALTER TABLE public.operations
  ALTER COLUMN status SET DEFAULT 'PENDING_PAYMENT'::public.operation_status;

-- Receipt columns
ALTER TABLE public.operations
  ADD COLUMN IF NOT EXISTS payment_receipt_url text,
  ADD COLUMN IF NOT EXISTS payment_receipt_name text,
  ADD COLUMN IF NOT EXISTS payment_submitted_at timestamptz;

-- Refresh PostgREST schema cache so the new columns are visible immediately
NOTIFY pgrst, 'reload schema';

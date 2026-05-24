
CREATE TABLE public.settlements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operation_id UUID NOT NULL REFERENCES public.operations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  tx_hash TEXT NOT NULL,
  ledger BIGINT,
  amount NUMERIC NOT NULL DEFAULT 0,
  asset TEXT NOT NULL DEFAULT 'XLM',
  destination_wallet TEXT NOT NULL,
  network TEXT NOT NULL DEFAULT 'stellar-testnet',
  status TEXT NOT NULL DEFAULT 'CONFIRMED',
  successful BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_settlements_operation ON public.settlements(operation_id);

ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own settlements"
ON public.settlements FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own settlements"
ON public.settlements FOR INSERT
WITH CHECK (auth.uid() = user_id);

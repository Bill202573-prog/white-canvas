-- Add AbacatePay fields to mensalidades table
ALTER TABLE public.mensalidades
ADD COLUMN IF NOT EXISTS abacatepay_billing_id TEXT,
ADD COLUMN IF NOT EXISTS abacatepay_url TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_mensalidades_abacatepay_billing_id 
ON public.mensalidades(abacatepay_billing_id) 
WHERE abacatepay_billing_id IS NOT NULL;
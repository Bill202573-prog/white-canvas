-- Add payment-related columns to campeonato_convocacoes
ALTER TABLE public.campeonato_convocacoes
ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT,
ADD COLUMN IF NOT EXISTS pix_br_code TEXT,
ADD COLUMN IF NOT EXISTS pix_qr_code_url TEXT,
ADD COLUMN IF NOT EXISTS pix_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS data_pagamento TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notificado_em TIMESTAMPTZ;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_campeonato_convocacoes_status ON public.campeonato_convocacoes(status);
CREATE INDEX IF NOT EXISTS idx_campeonato_convocacoes_crianca ON public.campeonato_convocacoes(crianca_id);
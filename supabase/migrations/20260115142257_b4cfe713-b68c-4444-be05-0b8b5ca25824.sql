-- Adicionar campos para rastrear cobrança na tabela amistoso_convocacoes
ALTER TABLE public.amistoso_convocacoes
  ADD COLUMN asaas_payment_id text,
  ADD COLUMN pix_br_code text,
  ADD COLUMN pix_qr_code_url text,
  ADD COLUMN pix_expires_at timestamp with time zone,
  ADD COLUMN data_pagamento timestamp with time zone;

-- Adicionar índice para buscar por status de pagamento
CREATE INDEX idx_amistoso_convocacoes_status ON public.amistoso_convocacoes(status);

-- Comentários para documentação
COMMENT ON COLUMN public.amistoso_convocacoes.asaas_payment_id IS 'ID do pagamento no Asaas';
COMMENT ON COLUMN public.amistoso_convocacoes.pix_br_code IS 'Código PIX copia-e-cola';
COMMENT ON COLUMN public.amistoso_convocacoes.pix_qr_code_url IS 'URL ou base64 do QR Code';
COMMENT ON COLUMN public.amistoso_convocacoes.pix_expires_at IS 'Data de expiração do PIX';
COMMENT ON COLUMN public.amistoso_convocacoes.data_pagamento IS 'Data/hora do pagamento confirmado';
-- Add notificado_em to track when convocation notification was sent
ALTER TABLE public.amistoso_convocacoes
  ADD COLUMN notificado_em timestamp with time zone;

COMMENT ON COLUMN public.amistoso_convocacoes.notificado_em IS 'Data/hora em que a notificação de convocação foi enviada ao responsável';

-- Add data_limite_pagamento to eventos_esportivos for payment deadline
ALTER TABLE public.eventos_esportivos
  ADD COLUMN data_limite_pagamento date;

COMMENT ON COLUMN public.eventos_esportivos.data_limite_pagamento IS 'Data limite para confirmação e pagamento das taxas';

-- Create index for faster querying of pending notifications
CREATE INDEX idx_amistoso_convocacoes_notificado ON public.amistoso_convocacoes(notificado_em) WHERE notificado_em IS NULL;
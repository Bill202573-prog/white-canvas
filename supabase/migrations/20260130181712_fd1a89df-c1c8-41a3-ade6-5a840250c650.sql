-- Permitir múltiplas cobranças de entrada por aluno+escola (histórico), mantendo no máximo 1 cobrança ATIVA (não cancelada)

-- Remove a constraint de unicidade que bloqueia gerar nova cobrança após cancelamento
ALTER TABLE public.cobrancas_entrada
  DROP CONSTRAINT IF EXISTS cobrancas_entrada_crianca_id_escolinha_id_key;

-- Garante que exista no máximo 1 cobrança não-cancelada por aluno+escola
CREATE UNIQUE INDEX IF NOT EXISTS cobrancas_entrada_unique_active
  ON public.cobrancas_entrada (crianca_id, escolinha_id)
  WHERE status <> 'cancelado';

-- Índice de apoio para listagens no financeiro da escola
CREATE INDEX IF NOT EXISTS cobrancas_entrada_escolinha_created_at_idx
  ON public.cobrancas_entrada (escolinha_id, created_at);
-- Adicionar campo de renda/faturamento mensal para subcontas Asaas
ALTER TABLE public.escola_cadastro_bancario
ADD COLUMN income_value NUMERIC(12, 2) NULL;

-- Comentário explicativo
COMMENT ON COLUMN public.escola_cadastro_bancario.income_value IS 'Renda/faturamento mensal em reais para registro no Asaas';
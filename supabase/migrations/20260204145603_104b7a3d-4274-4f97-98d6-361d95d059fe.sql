-- Add column to record which month the first tuition included in enrollment charge covers
ALTER TABLE public.cobrancas_entrada
  ADD COLUMN IF NOT EXISTS mes_referencia_primeira_mensalidade date;

COMMENT ON COLUMN public.cobrancas_entrada.mes_referencia_primeira_mensalidade
  IS 'Month/year the first tuition within this enrollment charge is valid for. E.g. 2026-02-01 means this tuition covers February 2026.';
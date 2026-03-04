
-- Add birth date column to escola_cadastro_bancario table
ALTER TABLE public.escola_cadastro_bancario 
ADD COLUMN data_nascimento DATE;

COMMENT ON COLUMN public.escola_cadastro_bancario.data_nascimento IS 'Data de nascimento do titular (obrigatório para PF no Asaas)';

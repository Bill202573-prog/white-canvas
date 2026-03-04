
-- Add temporary password fields to responsaveis table
ALTER TABLE public.responsaveis
ADD COLUMN IF NOT EXISTS senha_temporaria text,
ADD COLUMN IF NOT EXISTS senha_temporaria_ativa boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.responsaveis.senha_temporaria IS 'Senha temporária gerada no cadastro do responsável';
COMMENT ON COLUMN public.responsaveis.senha_temporaria_ativa IS 'Indica se a senha temporária ainda está ativa';

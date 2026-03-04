-- Add second partner (sócio) fields to escolinhas table
ALTER TABLE public.escolinhas 
ADD COLUMN IF NOT EXISTS nome_socio text,
ADD COLUMN IF NOT EXISTS email_socio text,
ADD COLUMN IF NOT EXISTS telefone_socio text,
ADD COLUMN IF NOT EXISTS socio_user_id uuid,
ADD COLUMN IF NOT EXISTS senha_temporaria_socio text,
ADD COLUMN IF NOT EXISTS senha_temporaria_socio_ativa boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.escolinhas.nome_socio IS 'Nome do segundo responsável (sócio) da escolinha';
COMMENT ON COLUMN public.escolinhas.email_socio IS 'Email do segundo responsável (sócio) da escolinha';
COMMENT ON COLUMN public.escolinhas.telefone_socio IS 'Telefone do segundo responsável (sócio) da escolinha';
COMMENT ON COLUMN public.escolinhas.socio_user_id IS 'User ID do sócio para autenticação';
COMMENT ON COLUMN public.escolinhas.senha_temporaria_socio IS 'Senha temporária gerada para o sócio';
COMMENT ON COLUMN public.escolinhas.senha_temporaria_socio_ativa IS 'Indica se a senha temporária do sócio está ativa';
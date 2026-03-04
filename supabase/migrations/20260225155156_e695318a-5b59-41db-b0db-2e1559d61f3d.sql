
-- Add private identification fields to perfis_rede
ALTER TABLE public.perfis_rede 
  ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT,
  ADD COLUMN IF NOT EXISTS tipo_documento TEXT DEFAULT 'cpf' CHECK (tipo_documento IN ('cpf', 'cnpj')),
  ADD COLUMN IF NOT EXISTS telefone_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS status_conta TEXT DEFAULT 'ativo' CHECK (status_conta IN ('ativo', 'inativo'));

-- Add private identification fields to perfil_atleta
ALTER TABLE public.perfil_atleta
  ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT,
  ADD COLUMN IF NOT EXISTS tipo_documento TEXT DEFAULT 'cpf',
  ADD COLUMN IF NOT EXISTS telefone_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS status_conta TEXT DEFAULT 'ativo' CHECK (status_conta IN ('ativo', 'inativo'));

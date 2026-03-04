-- Atualizar a view pública de escolinhas para incluir campos de contato para indicações
-- (telefone e whatsapp_indicacoes são necessários para o fluxo público de indicação)

DROP VIEW IF EXISTS public.escolinhas_publico;

CREATE VIEW public.escolinhas_publico
WITH (security_invoker = false) AS
SELECT
  id,
  nome,
  logo_url,
  cidade,
  estado,
  ativo,
  telefone,
  whatsapp_indicacoes
FROM escolinhas;

-- Garantir acesso para usuários anônimos e autenticados
GRANT SELECT ON public.escolinhas_publico TO anon, authenticated;
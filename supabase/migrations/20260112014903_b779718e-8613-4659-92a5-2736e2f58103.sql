-- Criar VIEW segura para escolinhas (apenas campos públicos)
-- Esta VIEW expõe apenas informações não sensíveis para responsáveis e professores
CREATE OR REPLACE VIEW public.escolinhas_publico AS
SELECT 
  id,
  nome,
  logo_url,
  cidade,
  estado,
  ativo
FROM public.escolinhas;

-- Conceder permissão de SELECT para usuários autenticados
GRANT SELECT ON public.escolinhas_publico TO authenticated;

-- Criar VIEW segura para professores (apenas campos públicos)
-- Esta VIEW expõe apenas informações básicas, sem dados pessoais sensíveis
CREATE OR REPLACE VIEW public.professores_publico AS
SELECT 
  id,
  nome,
  foto_url,
  escolinha_id,
  ativo
FROM public.professores;

-- Conceder permissão de SELECT para usuários autenticados
GRANT SELECT ON public.professores_publico TO authenticated;

-- Comentários explicativos para documentação
COMMENT ON VIEW public.escolinhas_publico IS 'VIEW segura que expõe apenas campos não sensíveis das escolinhas. Usada por responsáveis e professores. Dados sensíveis (email, telefone, CNPJ, CPF, senhas) ficam protegidos na tabela base.';

COMMENT ON VIEW public.professores_publico IS 'VIEW segura que expõe apenas campos não sensíveis dos professores. Usada para exibição em listas e perfis públicos. Dados sensíveis (email, telefone, CPF, endereço, senha) ficam protegidos na tabela base.';
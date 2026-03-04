
-- =====================================================
-- SEGURANÇA: Proteger dados sensíveis do Asaas
-- Escolas NÃO devem ver: asaas_api_key, asaas_wallet_id
-- Apenas admin global pode ver todos os campos
-- =====================================================

-- 1. Criar VIEW pública que oculta campos sensíveis
-- Esta view será usada pelas escolas
CREATE OR REPLACE VIEW public.escola_cadastro_bancario_publico
WITH (security_invoker = on) AS
SELECT 
  id,
  escolinha_id,
  nome,
  email,
  telefone,
  tipo_pessoa,
  -- Dados bancários básicos (escola pode ver)
  banco,
  agencia,
  conta,
  tipo_conta,
  -- Endereço
  cep,
  rua,
  numero,
  complemento,
  bairro,
  cidade,
  estado,
  -- Status do Asaas (escola pode ver status, mas NÃO as credenciais)
  asaas_status,
  asaas_enviado_em,
  asaas_atualizado_em,
  -- Account ID é necessário para determinar se a subconta foi criada
  -- Mas NÃO exponha a API Key nem Wallet ID
  CASE 
    WHEN asaas_account_id IS NOT NULL THEN true 
    ELSE false 
  END as subconta_criada,
  -- Outros campos
  data_nascimento,
  income_value,
  created_at,
  updated_at
FROM public.escola_cadastro_bancario;

-- 2. Remover a policy que permite escola ver TODOS os campos
DROP POLICY IF EXISTS "School admin can view own bank registration" ON public.escola_cadastro_bancario;

-- 3. Criar nova policy restritiva na tabela base
-- Apenas admin global pode SELECT diretamente na tabela
CREATE POLICY "Only global admin can view full bank data"
ON public.escola_cadastro_bancario
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::user_role)
);

-- 4. Manter policies de INSERT e UPDATE para escola
-- (já existem e estão corretas)

-- 5. Criar policies para a VIEW pública
-- Escola pode ver sua própria view (sem dados sensíveis)
GRANT SELECT ON public.escola_cadastro_bancario_publico TO authenticated;

-- 6. Criar função helper para escola verificar status sem expor credenciais
CREATE OR REPLACE FUNCTION public.get_escola_asaas_status(p_escolinha_id uuid)
RETURNS TABLE (
  has_cadastro boolean,
  asaas_status text,
  subconta_criada boolean,
  enviado_em timestamptz,
  atualizado_em timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    true as has_cadastro,
    ecb.asaas_status,
    (ecb.asaas_account_id IS NOT NULL) as subconta_criada,
    ecb.asaas_enviado_em as enviado_em,
    ecb.asaas_atualizado_em as atualizado_em
  FROM escola_cadastro_bancario ecb
  WHERE ecb.escolinha_id = p_escolinha_id
    AND is_admin_of_escolinha(p_escolinha_id);
$$;

-- Comentário explicativo
COMMENT ON VIEW public.escola_cadastro_bancario_publico IS 
'View pública para escolas verem dados do cadastro bancário SEM credenciais sensíveis do Asaas (api_key, wallet_id)';

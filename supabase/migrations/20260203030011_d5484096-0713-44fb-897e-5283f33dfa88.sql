
-- =====================================================
-- MIGRAÇÃO: Ativar controle de acesso completo para Atividades Externas
-- =====================================================

-- 1. Atualizar a função has_atividades_externas_access para usar lógica hierárquica completa
-- Esta função é chamada pelo frontend e pelo RLS para verificar acesso global
CREATE OR REPLACE FUNCTION public.has_atividades_externas_access(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_modo text;
  v_user_email text;
  v_escola_liberada boolean := false;
  v_atleta_isento boolean := false;
BEGIN
  -- 1. Buscar modo global da feature
  SELECT valor INTO v_modo
  FROM saas_config
  WHERE chave = 'atividades_externas_modo';
  
  -- Se desativado globalmente, NINGUÉM pode usar
  IF v_modo = 'desativado' OR v_modo IS NULL THEN
    RETURN false;
  END IF;
  
  -- Se modo beta, todos os usuários autenticados podem usar
  IF v_modo = 'beta' THEN
    RETURN true;
  END IF;
  
  -- Modo 'pago': verificar hierarquia de liberações
  
  -- 2. Verificar se usuário está na whitelist (exceção individual)
  SELECT email INTO v_user_email FROM auth.users WHERE id = check_user_id;
  
  SELECT EXISTS (
    SELECT 1 FROM atividades_externas_whitelist
    WHERE (user_id = check_user_id OR user_email = v_user_email)
    AND ativo = true
    AND (expires_at IS NULL OR expires_at > now())
  ) INTO v_atleta_isento;
  
  IF v_atleta_isento THEN
    RETURN true;
  END IF;
  
  -- 3. Verificar se alguma escola do usuário está liberada
  -- Responsável: verifica se alguma escola dos filhos está liberada
  SELECT EXISTS (
    SELECT 1 
    FROM crianca_responsavel cr
    JOIN responsaveis r ON r.id = cr.responsavel_id
    JOIN crianca_escolinha ce ON ce.crianca_id = cr.crianca_id AND ce.ativo = true
    JOIN escolinhas e ON e.id = ce.escolinha_id
    WHERE r.user_id = check_user_id
    AND e.atividades_externas_liberado = true
    AND (e.atividades_externas_liberado_ate IS NULL OR e.atividades_externas_liberado_ate >= CURRENT_DATE)
  ) INTO v_escola_liberada;
  
  IF v_escola_liberada THEN
    RETURN true;
  END IF;
  
  -- Nenhuma liberação encontrada
  RETURN false;
END;
$$;

-- 2. Criar função para verificar acesso para uma criança específica
-- Esta é usada internamente pelo RLS para validar operações em registros específicos
CREATE OR REPLACE FUNCTION public.has_atividades_externas_access_for_child(check_user_id uuid, check_crianca_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_modo text;
  v_user_email text;
  v_escola_liberada boolean := false;
  v_atleta_isento boolean := false;
  v_escolinha_id uuid;
BEGIN
  -- 1. Buscar modo global
  SELECT valor INTO v_modo
  FROM saas_config
  WHERE chave = 'atividades_externas_modo';
  
  -- Se desativado globalmente, NINGUÉM pode usar
  IF v_modo = 'desativado' OR v_modo IS NULL THEN
    RETURN false;
  END IF;
  
  -- Se modo beta, todos podem usar
  IF v_modo = 'beta' THEN
    RETURN true;
  END IF;
  
  -- Modo 'pago': verificar hierarquia
  
  -- 2. Verificar whitelist do usuário
  SELECT email INTO v_user_email FROM auth.users WHERE id = check_user_id;
  
  SELECT EXISTS (
    SELECT 1 FROM atividades_externas_whitelist
    WHERE (user_id = check_user_id OR user_email = v_user_email)
    AND ativo = true
    AND (expires_at IS NULL OR expires_at > now())
  ) INTO v_atleta_isento;
  
  IF v_atleta_isento THEN
    RETURN true;
  END IF;
  
  -- 3. Verificar se a escola da criança está liberada
  SELECT ce.escolinha_id INTO v_escolinha_id
  FROM crianca_escolinha ce
  WHERE ce.crianca_id = check_crianca_id
  AND ce.ativo = true
  LIMIT 1;
  
  IF v_escolinha_id IS NOT NULL THEN
    SELECT (
      atividades_externas_liberado = true
      AND (atividades_externas_liberado_ate IS NULL OR atividades_externas_liberado_ate >= CURRENT_DATE)
    ) INTO v_escola_liberada
    FROM escolinhas
    WHERE id = v_escolinha_id;
    
    IF v_escola_liberada THEN
      RETURN true;
    END IF;
  END IF;
  
  -- Sem liberação
  RETURN false;
END;
$$;

-- 3. Atualizar RLS Policies para usar verificação por criança

-- DROP das policies antigas
DROP POLICY IF EXISTS "Whitelist pode criar atividades" ON atividades_externas;
DROP POLICY IF EXISTS "Whitelist pode ver atividades dos filhos" ON atividades_externas;
DROP POLICY IF EXISTS "Whitelist pode editar suas atividades" ON atividades_externas;
DROP POLICY IF EXISTS "Whitelist pode deletar suas atividades" ON atividades_externas;

-- Policy INSERT - usuário precisa ter acesso E ser o responsável da criança
CREATE POLICY "Usuarios liberados podem criar atividades"
ON atividades_externas
FOR INSERT
TO authenticated
WITH CHECK (
  has_atividades_externas_access_for_child(auth.uid(), crianca_id)
  AND crianca_id IN (SELECT get_criancas_do_responsavel(auth.uid()))
  AND criado_por = auth.uid()
  AND visibilidade = 'privado'
);

-- Policy SELECT - usuário precisa ter acesso E ser o responsável
CREATE POLICY "Usuarios liberados podem ver atividades dos filhos"
ON atividades_externas
FOR SELECT
TO authenticated
USING (
  has_atividades_externas_access_for_child(auth.uid(), crianca_id)
  AND crianca_id IN (SELECT get_criancas_do_responsavel(auth.uid()))
);

-- Policy UPDATE - usuário precisa ter acesso E ser o criador
CREATE POLICY "Usuarios liberados podem editar suas atividades"
ON atividades_externas
FOR UPDATE
TO authenticated
USING (
  has_atividades_externas_access_for_child(auth.uid(), crianca_id)
  AND criado_por = auth.uid()
)
WITH CHECK (
  visibilidade = 'privado'
);

-- Policy DELETE - usuário precisa ter acesso E ser o criador
CREATE POLICY "Usuarios liberados podem deletar suas atividades"
ON atividades_externas
FOR DELETE
TO authenticated
USING (
  has_atividades_externas_access_for_child(auth.uid(), crianca_id)
  AND criado_por = auth.uid()
);

-- 4. Adicionar comentários para documentação
COMMENT ON FUNCTION public.has_atividades_externas_access IS 
'Verifica se o usuário tem acesso à funcionalidade Atividades Externas.
Hierarquia: 
1. Modo global (desativado/beta/pago) em saas_config
2. Whitelist individual (atividades_externas_whitelist)
3. Liberação por escolinha (escolinhas.atividades_externas_liberado)';

COMMENT ON FUNCTION public.has_atividades_externas_access_for_child IS 
'Verifica acesso para uma criança específica. Usada pelas RLS policies.';

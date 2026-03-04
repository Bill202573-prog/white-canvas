-- =============================================
-- CONTROLE ADMINISTRATIVO: ATIVIDADES EXTERNAS
-- =============================================

-- 1️⃣ CONTROLE GLOBAL (Plataforma)
-- Inserir configuração de modo na tabela saas_config
INSERT INTO public.saas_config (chave, valor, descricao)
VALUES (
  'atividades_externas_modo',
  'beta',
  'Modo da funcionalidade Atividades Externas: desativado | beta | pago'
)
ON CONFLICT (chave) DO NOTHING;

-- 2️⃣ CONTROLE POR ESCOLINHA
-- Adicionar campos de controle administrativo na tabela escolinhas
ALTER TABLE public.escolinhas
ADD COLUMN IF NOT EXISTS atividades_externas_liberado boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS atividades_externas_motivo text,
ADD COLUMN IF NOT EXISTS atividades_externas_liberado_ate date;

-- Adicionar check constraint para motivos válidos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'escolinhas_atividades_externas_motivo_check'
  ) THEN
    ALTER TABLE public.escolinhas
    ADD CONSTRAINT escolinhas_atividades_externas_motivo_check
    CHECK (atividades_externas_motivo IS NULL OR atividades_externas_motivo IN ('piloto', 'cortesia', 'parceria'));
  END IF;
END $$;

-- Comentários para documentação
COMMENT ON COLUMN public.escolinhas.atividades_externas_liberado IS 'Se true, escola pode usar Atividades Externas (controlado pelo admin da plataforma)';
COMMENT ON COLUMN public.escolinhas.atividades_externas_motivo IS 'Motivo da liberação: piloto | cortesia | parceria';
COMMENT ON COLUMN public.escolinhas.atividades_externas_liberado_ate IS 'Data limite da liberação (opcional)';

-- 3️⃣ CONTROLE POR ATLETA (já existe atividades_externas_whitelist, mas vamos melhorar)
-- Adicionar campo para distinguir tipo de isenção
ALTER TABLE public.atividades_externas_whitelist
ADD COLUMN IF NOT EXISTS tipo_isencao text DEFAULT 'beta_tester';

-- Adicionar check constraint para tipos válidos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'atividades_externas_whitelist_tipo_isencao_check'
  ) THEN
    ALTER TABLE public.atividades_externas_whitelist
    ADD CONSTRAINT atividades_externas_whitelist_tipo_isencao_check
    CHECK (tipo_isencao IN ('beta_tester', 'cortesia'));
  END IF;
END $$;

COMMENT ON COLUMN public.atividades_externas_whitelist.tipo_isencao IS 'Tipo de isenção: beta_tester | cortesia';

-- 4️⃣ FUNÇÃO DE VERIFICAÇÃO DE ACESSO (usada pelo frontend e RLS)
CREATE OR REPLACE FUNCTION public.pode_usar_atividades_externas(p_user_id uuid, p_crianca_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_modo text;
  v_escola_liberada boolean;
  v_atleta_isento boolean;
  v_escolinha_id uuid;
BEGIN
  -- 1. Buscar modo global
  SELECT valor INTO v_modo
  FROM saas_config
  WHERE chave = 'atividades_externas_modo';
  
  -- Se desativado globalmente, ninguém usa
  IF v_modo = 'desativado' THEN
    RETURN false;
  END IF;
  
  -- Se modo beta, todos os autenticados podem usar
  IF v_modo = 'beta' THEN
    RETURN true;
  END IF;
  
  -- Modo 'pago': verificar hierarquia de liberações
  
  -- 2. Verificar se usuário está na whitelist (atleta isento)
  SELECT EXISTS (
    SELECT 1 FROM atividades_externas_whitelist
    WHERE (user_id = p_user_id OR user_email = (SELECT email FROM auth.users WHERE id = p_user_id))
    AND ativo = true
    AND (expires_at IS NULL OR expires_at > now())
  ) INTO v_atleta_isento;
  
  IF v_atleta_isento THEN
    RETURN true;
  END IF;
  
  -- 3. Verificar se escola do atleta está liberada
  IF p_crianca_id IS NOT NULL THEN
    -- Buscar escolinha da criança
    SELECT ce.escolinha_id INTO v_escolinha_id
    FROM crianca_escolinha ce
    WHERE ce.crianca_id = p_crianca_id
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
  END IF;
  
  -- Sem liberação encontrada
  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.pode_usar_atividades_externas IS 'Verifica se usuário pode usar Atividades Externas baseado na hierarquia: Global > Escola > Atleta';

-- 5️⃣ GRANT para função ser chamada pelo frontend
GRANT EXECUTE ON FUNCTION public.pode_usar_atividades_externas TO authenticated;
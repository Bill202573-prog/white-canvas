
-- Tabela de assinaturas do Carreira ID
CREATE TABLE public.carreira_assinaturas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  crianca_id UUID NOT NULL REFERENCES public.criancas(id),
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'cancelada', 'expirada', 'pendente')),
  plano TEXT NOT NULL DEFAULT 'mensal',
  valor NUMERIC(10,2),
  gateway TEXT, -- 'asaas', 'stripe', etc - definido depois
  gateway_subscription_id TEXT,
  inicio_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_em TIMESTAMPTZ,
  cancelada_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, crianca_id)
);

-- Enable RLS
ALTER TABLE public.carreira_assinaturas ENABLE ROW LEVEL SECURITY;

-- Usuário vê suas próprias assinaturas
CREATE POLICY "Users can view own subscriptions"
  ON public.carreira_assinaturas FOR SELECT
  USING (auth.uid() = user_id);

-- Usuário pode inserir para si mesmo
CREATE POLICY "Users can create own subscriptions"
  ON public.carreira_assinaturas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuário pode atualizar suas assinaturas
CREATE POLICY "Users can update own subscriptions"
  ON public.carreira_assinaturas FOR UPDATE
  USING (auth.uid() = user_id);

-- Admin pode ver todas (via service role)

-- Trigger de updated_at
CREATE TRIGGER update_carreira_assinaturas_updated_at
  BEFORE UPDATE ON public.carreira_assinaturas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Config do limite free na saas_config
INSERT INTO public.saas_config (chave, valor, descricao)
VALUES ('carreira_limite_free', '2', 'Número de atividades externas gratuitas por atleta no Carreira ID')
ON CONFLICT (chave) DO NOTHING;

-- Função para verificar se atleta pode criar mais atividades
-- Retorna: 'allowed', 'limit_reached', ou 'subscribed'
CREATE OR REPLACE FUNCTION public.check_carreira_atividade_limit(
  p_user_id UUID,
  p_crianca_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_limite INTEGER;
  v_count INTEGER;
  v_has_subscription BOOLEAN;
  v_has_access BOOLEAN;
BEGIN
  -- 1. Verificar se tem acesso via sistema legado (escolinha liberada, whitelist, beta)
  SELECT has_atividades_externas_access(p_user_id) INTO v_has_access;
  
  IF v_has_access THEN
    -- Acesso via escolinha/whitelist = sem limite
    RETURN jsonb_build_object(
      'status', 'allowed',
      'source', 'legacy_access',
      'count', 0,
      'limit', 0
    );
  END IF;
  
  -- 2. Verificar se tem assinatura ativa do Carreira
  SELECT EXISTS (
    SELECT 1 FROM carreira_assinaturas
    WHERE user_id = p_user_id
    AND crianca_id = p_crianca_id
    AND status = 'ativa'
    AND (expira_em IS NULL OR expira_em > now())
  ) INTO v_has_subscription;
  
  IF v_has_subscription THEN
    RETURN jsonb_build_object(
      'status', 'subscribed',
      'source', 'carreira_subscription',
      'count', 0,
      'limit', 0
    );
  END IF;
  
  -- 3. Modo freemium: contar atividades e comparar com limite
  SELECT COALESCE((SELECT valor::integer FROM saas_config WHERE chave = 'carreira_limite_free'), 2)
  INTO v_limite;
  
  SELECT COUNT(*)::integer INTO v_count
  FROM atividades_externas
  WHERE crianca_id = p_crianca_id
  AND criado_por = p_user_id;
  
  IF v_count >= v_limite THEN
    RETURN jsonb_build_object(
      'status', 'limit_reached',
      'source', 'freemium',
      'count', v_count,
      'limit', v_limite
    );
  END IF;
  
  RETURN jsonb_build_object(
    'status', 'allowed',
    'source', 'freemium',
    'count', v_count,
    'limit', v_limite
  );
END;
$$;

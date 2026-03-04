
-- Fix: check_carreira_atividade_limit should NOT use legacy beta access for Carreira users
-- The legacy has_atividades_externas_access includes global 'beta' mode which bypasses freemium
-- For Carreira, we only check subscriptions and freemium limit
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
  v_has_whitelist BOOLEAN;
BEGIN
  -- 1. Verificar se tem whitelist individual (exceção específica, não beta global)
  SELECT EXISTS (
    SELECT 1 FROM atividades_externas_whitelist
    WHERE (user_id = p_user_id OR user_email = (SELECT email FROM auth.users WHERE id = p_user_id))
    AND ativo = true
    AND (expires_at IS NULL OR expires_at > now())
  ) INTO v_has_whitelist;
  
  IF v_has_whitelist THEN
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

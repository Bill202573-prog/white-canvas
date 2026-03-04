-- 1. RLS policy for guardians to read their children's campeonato_convocacoes
CREATE POLICY "Guardians can view their children campeonato convocacoes"
ON public.campeonato_convocacoes
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM crianca_responsavel cr
    JOIN responsaveis r ON r.id = cr.responsavel_id
    WHERE cr.crianca_id = campeonato_convocacoes.crianca_id
      AND r.user_id = auth.uid()
  )
);

-- 2. Secure function to update child photo (bypasses RLS for guardians)
CREATE OR REPLACE FUNCTION public.update_child_photo(p_crianca_id uuid, p_foto_url text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_is_guardian boolean;
  v_is_school_admin boolean;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Check if user is guardian of this child
  SELECT EXISTS (
    SELECT 1
    FROM crianca_responsavel cr
    JOIN responsaveis r ON r.id = cr.responsavel_id
    WHERE cr.crianca_id = p_crianca_id
      AND r.user_id = v_user_id
  ) INTO v_is_guardian;
  
  -- Check if user is school admin of this child
  SELECT EXISTS (
    SELECT 1
    FROM crianca_escolinha ce
    JOIN escolinhas e ON e.id = ce.escolinha_id
    WHERE ce.crianca_id = p_crianca_id
      AND e.admin_user_id = v_user_id
  ) INTO v_is_school_admin;
  
  IF NOT v_is_guardian AND NOT v_is_school_admin THEN
    RAISE EXCEPTION 'Sem permissão para atualizar foto desta criança';
  END IF;
  
  UPDATE criancas
  SET foto_url = p_foto_url
  WHERE id = p_crianca_id;
  
  RETURN true;
END;
$$;

-- 3. Add escolinha_id population for guardian access logs
-- First, let's create a function to get escolinha_id for a guardian
CREATE OR REPLACE FUNCTION public.get_guardian_escolinha_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT ce.escolinha_id
  FROM crianca_escolinha ce
  JOIN crianca_responsavel cr ON cr.crianca_id = ce.crianca_id
  JOIN responsaveis r ON r.id = cr.responsavel_id
  WHERE r.user_id = p_user_id
    AND ce.ativo = true
  LIMIT 1;
$$;

-- 4. Create a view for parent access analytics per school
CREATE OR REPLACE VIEW public.parent_access_analytics AS
SELECT 
  ce.escolinha_id,
  r.id as responsavel_id,
  r.nome as responsavel_nome,
  r.user_id,
  MIN(al.accessed_at) as primeiro_acesso,
  MAX(al.accessed_at) as ultimo_acesso,
  COUNT(al.id) as total_acessos,
  COUNT(CASE WHEN al.accessed_at >= NOW() - INTERVAL '7 days' THEN 1 END) as acessos_7_dias,
  COUNT(CASE WHEN al.accessed_at >= NOW() - INTERVAL '30 days' THEN 1 END) as acessos_30_dias
FROM responsaveis r
JOIN crianca_responsavel cr ON cr.responsavel_id = r.id
JOIN crianca_escolinha ce ON ce.crianca_id = cr.crianca_id AND ce.ativo = true
LEFT JOIN acessos_log al ON al.user_id = r.user_id AND al.user_role = 'guardian'
GROUP BY ce.escolinha_id, r.id, r.nome, r.user_id;

-- 5. RLS for the view (school admins can see their school's data)
-- Views don't support RLS directly, so we'll create a function instead
CREATE OR REPLACE FUNCTION public.get_school_parent_access_analytics(p_escolinha_id uuid)
RETURNS TABLE (
  responsavel_id uuid,
  responsavel_nome text,
  primeiro_acesso timestamptz,
  ultimo_acesso timestamptz,
  total_acessos bigint,
  acessos_7_dias bigint,
  acessos_30_dias bigint,
  tem_acesso boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    r.id as responsavel_id,
    r.nome as responsavel_nome,
    MIN(al.accessed_at) as primeiro_acesso,
    MAX(al.accessed_at) as ultimo_acesso,
    COUNT(al.id)::bigint as total_acessos,
    COUNT(CASE WHEN al.accessed_at >= NOW() - INTERVAL '7 days' THEN 1 END)::bigint as acessos_7_dias,
    COUNT(CASE WHEN al.accessed_at >= NOW() - INTERVAL '30 days' THEN 1 END)::bigint as acessos_30_dias,
    COUNT(al.id) > 0 as tem_acesso
  FROM responsaveis r
  JOIN crianca_responsavel cr ON cr.responsavel_id = r.id
  JOIN crianca_escolinha ce ON ce.crianca_id = cr.crianca_id AND ce.ativo = true
  LEFT JOIN acessos_log al ON al.user_id = r.user_id AND al.user_role = 'guardian'
  WHERE ce.escolinha_id = p_escolinha_id
  GROUP BY r.id, r.nome
  ORDER BY ultimo_acesso DESC NULLS LAST;
$$;
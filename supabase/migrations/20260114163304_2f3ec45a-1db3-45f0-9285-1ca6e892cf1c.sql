-- Update guardian_can_view_escolinha to allow viewing schools even if student is inactive
-- This is important to preserve the athlete's journey history with school names

CREATE OR REPLACE FUNCTION public.guardian_can_view_escolinha(_escolinha_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM crianca_escolinha ce
    JOIN crianca_responsavel cr ON cr.crianca_id = ce.crianca_id
    JOIN responsaveis r ON r.id = cr.responsavel_id
    WHERE ce.escolinha_id = _escolinha_id
      AND r.user_id = auth.uid()
    -- Removed: AND ce.ativo = true
    -- Now guardians can see schools even if their child is inactive
    -- This preserves the historical journey of the athlete
  )
$$;
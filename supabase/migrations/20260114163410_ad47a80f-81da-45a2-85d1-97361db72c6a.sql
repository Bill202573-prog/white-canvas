-- Update guardian_can_access_escolinha to allow access to schools even if student is inactive
-- This preserves the athlete's journey history and allows guardians to see historical data

CREATE OR REPLACE FUNCTION public.guardian_can_access_escolinha(_escolinha_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM responsaveis r
    INNER JOIN crianca_responsavel cr ON cr.responsavel_id = r.id
    INNER JOIN crianca_escolinha ce ON ce.crianca_id = cr.crianca_id
    WHERE r.user_id = auth.uid()
      AND ce.escolinha_id = _escolinha_id
    -- Removed: AND ce.ativo = true
    -- Now guardians can access school data even if their child is inactive
    -- This preserves historical journey data
  )
$$;
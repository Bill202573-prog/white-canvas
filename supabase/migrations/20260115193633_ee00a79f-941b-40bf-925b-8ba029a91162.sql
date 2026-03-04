-- Update guardian_can_access_evento to also check amistoso_convocacoes
CREATE OR REPLACE FUNCTION public.guardian_can_access_evento(_evento_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
  SELECT EXISTS (
    -- Check via evento_time_alunos (for events with teams)
    SELECT 1
    FROM evento_times et
    JOIN evento_time_alunos eta ON eta.time_id = et.id
    JOIN crianca_responsavel cr ON cr.crianca_id = eta.crianca_id
    JOIN responsaveis r ON r.id = cr.responsavel_id
    WHERE et.evento_id = _evento_id
      AND r.user_id = auth.uid()
  )
  OR EXISTS (
    -- Check via amistoso_convocacoes (for friendly matches)
    SELECT 1
    FROM amistoso_convocacoes ac
    JOIN crianca_responsavel cr ON cr.crianca_id = ac.crianca_id
    JOIN responsaveis r ON r.id = cr.responsavel_id
    WHERE ac.evento_id = _evento_id
      AND r.user_id = auth.uid()
  )
$function$;
-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Responsaveis podem ver eventos dos filhos" ON public.eventos_esportivos;

-- Create a security definer function to check if guardian can access event
CREATE OR REPLACE FUNCTION public.guardian_can_access_evento(_evento_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM evento_times et
    JOIN evento_time_alunos eta ON eta.time_id = et.id
    JOIN crianca_responsavel cr ON cr.crianca_id = eta.crianca_id
    JOIN responsaveis r ON r.id = cr.responsavel_id
    WHERE et.evento_id = _evento_id
      AND r.user_id = auth.uid()
  )
$$;

-- Create new policy using the security definer function
CREATE POLICY "Responsaveis podem ver eventos dos filhos"
ON public.eventos_esportivos
FOR SELECT
USING (guardian_can_access_evento(id));
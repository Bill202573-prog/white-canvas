-- Drop the problematic policy for evento_times
DROP POLICY IF EXISTS "Responsaveis podem ver times dos filhos" ON public.evento_times;

-- Create a security definer function to check if guardian can access team
CREATE OR REPLACE FUNCTION public.guardian_can_access_time(_time_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM evento_time_alunos eta
    JOIN crianca_responsavel cr ON cr.crianca_id = eta.crianca_id
    JOIN responsaveis r ON r.id = cr.responsavel_id
    WHERE eta.time_id = _time_id
      AND r.user_id = auth.uid()
  )
$$;

-- Create new policy using the security definer function
CREATE POLICY "Responsaveis podem ver times dos filhos"
ON public.evento_times
FOR SELECT
USING (guardian_can_access_time(id));
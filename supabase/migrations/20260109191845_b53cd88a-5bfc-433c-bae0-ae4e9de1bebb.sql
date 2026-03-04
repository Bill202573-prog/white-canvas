-- Drop the existing policy that doesn't work for INSERT
DROP POLICY IF EXISTS "Admins de escolinha podem gerenciar aulas das suas turmas" ON public.aulas;

-- Create a function to check if school admin can access a turma (for INSERT operations)
CREATE OR REPLACE FUNCTION public.school_admin_can_access_turma_for_aula(_turma_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.turmas t
    JOIN public.escolinhas e ON e.id = t.escolinha_id
    WHERE t.id = _turma_id
      AND e.admin_user_id = auth.uid()
  );
$$;

-- Create separate policies for SELECT/UPDATE/DELETE (using aula id) and INSERT (using turma_id)
CREATE POLICY "School admins can SELECT aulas from their turmas"
ON public.aulas
FOR SELECT
USING (school_admin_can_access_aula(id));

CREATE POLICY "School admins can INSERT aulas for their turmas"
ON public.aulas
FOR INSERT
WITH CHECK (school_admin_can_access_turma_for_aula(turma_id));

CREATE POLICY "School admins can UPDATE aulas from their turmas"
ON public.aulas
FOR UPDATE
USING (school_admin_can_access_aula(id));

CREATE POLICY "School admins can DELETE aulas from their turmas"
ON public.aulas
FOR DELETE
USING (school_admin_can_access_aula(id));
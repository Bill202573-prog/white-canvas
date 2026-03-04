
-- Update is_teacher_of_aula_no_rls to also check turma_assistentes
CREATE OR REPLACE FUNCTION public.is_teacher_of_aula_no_rls(p_aula_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $$
  SELECT EXISTS (
    -- Main teacher of the turma
    SELECT 1 FROM public.aulas a
    JOIN public.turmas t ON t.id = a.turma_id
    JOIN public.professores p ON p.id = t.professor_id
    WHERE a.id = p_aula_id
      AND p.user_id = auth.uid()
  )
  OR EXISTS (
    -- Substitute teacher
    SELECT 1 FROM public.aulas a
    JOIN public.professores p ON p.id = a.professor_substituto_id
    WHERE a.id = p_aula_id
      AND p.user_id = auth.uid()
  )
  OR EXISTS (
    -- Assistant teacher via turma_assistentes
    SELECT 1 FROM public.aulas a
    JOIN public.turma_assistentes ta ON ta.turma_id = a.turma_id
    JOIN public.professores p ON p.id = ta.professor_id
    WHERE a.id = p_aula_id
      AND p.user_id = auth.uid()
  );
$$;

-- Also update is_teacher_of_turma_no_rls to include assistants
CREATE OR REPLACE FUNCTION public.is_teacher_of_turma_no_rls(p_turma_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.turmas t
    JOIN public.professores p ON p.id = t.professor_id
    WHERE t.id = p_turma_id
      AND p.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.turma_assistentes ta
    JOIN public.professores p ON p.id = ta.professor_id
    WHERE ta.turma_id = p_turma_id
      AND p.user_id = auth.uid()
  );
$$;

-- Update teacher_owns_turma to include assistants
CREATE OR REPLACE FUNCTION public.teacher_owns_turma(_turma_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.turmas t
    JOIN public.professores p ON p.id = t.professor_id
    WHERE t.id = _turma_id
      AND p.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.turma_assistentes ta
    JOIN public.professores p ON p.id = ta.professor_id
    WHERE ta.turma_id = _turma_id
      AND p.user_id = auth.uid()
  );
$$;

-- Update teacher_can_access_crianca to include assistant access
CREATE OR REPLACE FUNCTION public.teacher_can_access_crianca(_crianca_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.crianca_turma ct
    JOIN public.turmas t ON t.id = ct.turma_id
    JOIN public.professores p ON p.id = t.professor_id
    WHERE ct.crianca_id = _crianca_id
      AND p.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.crianca_turma ct
    JOIN public.turma_assistentes ta ON ta.turma_id = ct.turma_id
    JOIN public.professores p ON p.id = ta.professor_id
    WHERE ct.crianca_id = _crianca_id
      AND p.user_id = auth.uid()
  );
$$;

-- =============================================
-- CORRIGIR RECURSÃO INFINITA COMPLETA
-- =============================================

-- 1. Função para admin de escolinha verificar acesso a aulas (sem RLS)
CREATE OR REPLACE FUNCTION public.school_admin_can_access_aula(_aula_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.aulas a
    JOIN public.turmas t ON t.id = a.turma_id
    JOIN public.escolinhas e ON e.id = t.escolinha_id
    WHERE a.id = _aula_id
      AND e.admin_user_id = auth.uid()
  );
$$;

-- 2. Função para admin de escolinha verificar acesso a turmas (sem RLS)
CREATE OR REPLACE FUNCTION public.school_admin_can_access_turma(_turma_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.turmas t
    JOIN public.escolinhas e ON e.id = t.escolinha_id
    WHERE t.id = _turma_id
      AND e.admin_user_id = auth.uid()
  );
$$;

-- 3. Função para professor verificar se é responsável por uma turma (sem RLS)
CREATE OR REPLACE FUNCTION public.teacher_owns_turma(_turma_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.turmas t
    JOIN public.professores p ON p.id = t.professor_id
    WHERE t.id = _turma_id
      AND p.user_id = auth.uid()
  );
$$;

-- 4. Função para professor ver crianças das suas turmas (sem RLS)
CREATE OR REPLACE FUNCTION public.teacher_can_access_crianca(_crianca_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.crianca_turma ct
    JOIN public.turmas t ON t.id = ct.turma_id
    JOIN public.professores p ON p.id = t.professor_id
    WHERE ct.crianca_id = _crianca_id
      AND p.user_id = auth.uid()
  );
$$;

-- 5. Função para admin de escolinha verificar presença (sem RLS)
CREATE OR REPLACE FUNCTION public.school_admin_can_access_presenca(_aula_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.aulas a
    JOIN public.turmas t ON t.id = a.turma_id
    JOIN public.escolinhas e ON e.id = t.escolinha_id
    WHERE a.id = _aula_id
      AND e.admin_user_id = auth.uid()
  );
$$;

-- =============================================
-- RECRIAR POLICIES DE TURMAS
-- =============================================
DROP POLICY IF EXISTS "Admins de escolinha podem gerenciar turmas da sua escolinha" ON public.turmas;
DROP POLICY IF EXISTS "Professores podem ver suas turmas" ON public.turmas;

CREATE POLICY "Admins de escolinha podem gerenciar turmas da sua escolinha"
ON public.turmas FOR ALL
TO authenticated
USING (school_admin_can_access_turma(id))
WITH CHECK (school_admin_can_access_turma(id));

CREATE POLICY "Professores podem ver suas turmas"
ON public.turmas FOR SELECT
TO authenticated
USING (teacher_owns_turma(id));

-- =============================================
-- RECRIAR POLICIES DE PROFESSORES
-- =============================================
DROP POLICY IF EXISTS "Responsaveis podem ver professores das turmas dos filhos" ON public.professores;

CREATE POLICY "Responsaveis podem ver professores das turmas dos filhos"
ON public.professores FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'guardian'::user_role) AND
  EXISTS (
    SELECT 1 FROM public.turmas t
    JOIN public.crianca_turma ct ON ct.turma_id = t.id
    WHERE t.professor_id = professores.id
      AND ct.crianca_id IN (SELECT get_criancas_do_responsavel(auth.uid()))
      AND ct.ativo = true
  )
);

-- =============================================
-- RECRIAR POLICIES DE AULAS
-- =============================================
DROP POLICY IF EXISTS "Admins de escolinha podem gerenciar aulas das suas turmas" ON public.aulas;
DROP POLICY IF EXISTS "Professores podem gerenciar aulas das suas turmas" ON public.aulas;

CREATE POLICY "Admins de escolinha podem gerenciar aulas das suas turmas"
ON public.aulas FOR ALL
TO authenticated
USING (school_admin_can_access_aula(id))
WITH CHECK (school_admin_can_access_aula(id));

CREATE POLICY "Professores podem gerenciar aulas das suas turmas"
ON public.aulas FOR ALL
TO authenticated
USING (is_teacher_of_aula_no_rls(id))
WITH CHECK (is_teacher_of_aula_no_rls(id));

-- =============================================
-- RECRIAR POLICIES DE PRESENCAS
-- =============================================
DROP POLICY IF EXISTS "Admins de escolinha podem gerenciar presencas das suas turmas" ON public.presencas;
DROP POLICY IF EXISTS "Professores podem gerenciar presencas das suas aulas" ON public.presencas;

CREATE POLICY "Admins de escolinha podem gerenciar presencas das suas turmas"
ON public.presencas FOR ALL
TO authenticated
USING (school_admin_can_access_presenca(aula_id))
WITH CHECK (school_admin_can_access_presenca(aula_id));

CREATE POLICY "Professores podem gerenciar presencas das suas aulas"
ON public.presencas FOR ALL
TO authenticated
USING (is_teacher_of_aula_no_rls(aula_id))
WITH CHECK (is_teacher_of_aula_no_rls(aula_id));

-- =============================================
-- RECRIAR POLICIES DE CRIANCAS
-- =============================================
DROP POLICY IF EXISTS "Professores podem ver criancas das suas turmas" ON public.criancas;

CREATE POLICY "Professores podem ver criancas das suas turmas"
ON public.criancas FOR SELECT
TO authenticated
USING (teacher_can_access_crianca(id));
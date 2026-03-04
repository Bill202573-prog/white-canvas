-- =============================================
-- 1. ATUALIZAR VALORES DOS PLANOS SAAS
-- =============================================
UPDATE planos_saas SET valor_mensal = 170.00 WHERE min_alunos = 0 AND max_alunos = 50;
UPDATE planos_saas SET valor_mensal = 210.00 WHERE min_alunos = 51 AND max_alunos = 200;
UPDATE planos_saas SET valor_mensal = 250.00 WHERE min_alunos = 201 AND max_alunos = 300;
UPDATE planos_saas SET valor_mensal = 320.00 WHERE min_alunos = 301 AND max_alunos = 500;
UPDATE planos_saas SET valor_mensal = 460.00 WHERE min_alunos = 501 AND max_alunos = 800;
UPDATE planos_saas SET valor_mensal = 530.00 WHERE min_alunos = 801;

-- =============================================
-- 2. CORRIGIR RECURSÃO INFINITA - CRIAR FUNÇÕES SECURITY DEFINER
-- =============================================

-- Função para verificar se o usuário é professor de uma escolinha (sem RLS)
CREATE OR REPLACE FUNCTION public.is_teacher_of_escolinha_no_rls(_escolinha_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.professores p
    WHERE p.escolinha_id = _escolinha_id
      AND p.user_id = auth.uid()
      AND p.ativo = true
  );
$$;

-- Função para verificar se é admin de uma turma (sem RLS)
CREATE OR REPLACE FUNCTION public.is_admin_of_turma_no_rls(p_turma_id uuid)
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
    WHERE t.id = p_turma_id
      AND e.admin_user_id = auth.uid()
  );
$$;

-- Função para verificar se é professor de uma turma (sem RLS)
CREATE OR REPLACE FUNCTION public.is_teacher_of_turma_no_rls(p_turma_id uuid)
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
    WHERE t.id = p_turma_id
      AND p.user_id = auth.uid()
  );
$$;

-- Função para verificar se é admin de uma aula (sem RLS)
CREATE OR REPLACE FUNCTION public.is_admin_of_aula_no_rls(p_aula_id uuid)
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
    WHERE a.id = p_aula_id
      AND e.admin_user_id = auth.uid()
  );
$$;

-- Função para verificar se é professor de uma aula (sem RLS)
CREATE OR REPLACE FUNCTION public.is_teacher_of_aula_no_rls(p_aula_id uuid)
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
    JOIN public.professores p ON p.id = t.professor_id
    WHERE a.id = p_aula_id
      AND p.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.aulas a
    JOIN public.professores p ON p.id = a.professor_substituto_id
    WHERE a.id = p_aula_id
      AND p.user_id = auth.uid()
  );
$$;

-- =============================================
-- 3. RECRIAR POLICIES DE TURMAS SEM RECURSÃO
-- =============================================
DROP POLICY IF EXISTS "Professores podem ver suas turmas" ON public.turmas;

CREATE POLICY "Professores podem ver suas turmas"
ON public.turmas FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.professores p
    WHERE p.id = turmas.professor_id
      AND p.user_id = auth.uid()
  )
);

-- =============================================
-- 4. RECRIAR POLICIES DE PROFESSORES SEM RECURSÃO
-- =============================================
DROP POLICY IF EXISTS "Responsaveis podem ver professores das turmas dos filhos" ON public.professores;

CREATE POLICY "Responsaveis podem ver professores das turmas dos filhos"
ON public.professores FOR SELECT
TO authenticated
USING (
  CASE
    WHEN has_role(auth.uid(), 'guardian'::user_role) THEN 
      EXISTS (
        SELECT 1 FROM public.turmas t
        JOIN public.crianca_turma ct ON ct.turma_id = t.id
        WHERE t.professor_id = professores.id
          AND ct.crianca_id IN (SELECT get_criancas_do_responsavel(auth.uid()))
          AND ct.ativo = true
      )
    ELSE false
  END
);

-- =============================================
-- 5. RECRIAR POLICIES DE AULAS SEM RECURSÃO
-- =============================================
DROP POLICY IF EXISTS "Professores podem gerenciar aulas das suas turmas" ON public.aulas;
DROP POLICY IF EXISTS "Professores substitutos podem gerenciar suas aulas" ON public.aulas;

CREATE POLICY "Professores podem gerenciar aulas das suas turmas"
ON public.aulas FOR ALL
TO authenticated
USING (is_teacher_of_aula_no_rls(id))
WITH CHECK (is_teacher_of_aula_no_rls(id));

-- =============================================
-- 6. RECRIAR POLICIES DE PRESENCAS SEM RECURSÃO  
-- =============================================
DROP POLICY IF EXISTS "Professores podem gerenciar presencas das suas aulas" ON public.presencas;

CREATE POLICY "Professores podem gerenciar presencas das suas aulas"
ON public.presencas FOR ALL
TO authenticated
USING (is_teacher_of_aula_no_rls(aula_id))
WITH CHECK (is_teacher_of_aula_no_rls(aula_id));

-- =============================================
-- 7. CORRIGIR POLICY DE CRIANCAS (referência a turmas)
-- =============================================
DROP POLICY IF EXISTS "Professores podem ver criancas das suas turmas" ON public.criancas;

CREATE POLICY "Professores podem ver criancas das suas turmas"
ON public.criancas FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.crianca_turma ct
    JOIN public.turmas t ON t.id = ct.turma_id
    JOIN public.professores p ON p.id = t.professor_id
    WHERE ct.crianca_id = criancas.id
      AND p.user_id = auth.uid()
  )
);
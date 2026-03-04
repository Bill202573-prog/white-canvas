-- ============================================
-- FIX: Infinite recursion in RLS policies
-- Create SECURITY DEFINER functions with row_security = off
-- ============================================

-- Drop existing problematic functions if they exist (will recreate them safer)
DROP FUNCTION IF EXISTS public.guardian_owns_crianca(uuid);
DROP FUNCTION IF EXISTS public.guardian_can_access_turma(uuid);
DROP FUNCTION IF EXISTS public.guardian_can_access_escolinha(uuid);
DROP FUNCTION IF EXISTS public.school_admin_can_access_crianca(uuid);
DROP FUNCTION IF EXISTS public.school_admin_can_access_responsavel(uuid);

-- 1. Function to check if current user is guardian of a specific child
-- This is the "atomic" function that doesn't depend on other RLS policies
CREATE OR REPLACE FUNCTION public.guardian_owns_crianca(_crianca_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
SET row_security = 'off'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM responsaveis r
    INNER JOIN crianca_responsavel cr ON cr.responsavel_id = r.id
    WHERE r.user_id = auth.uid()
      AND cr.crianca_id = _crianca_id
  )
$$;

-- 2. Function to check if current user (guardian) can access a turma
CREATE OR REPLACE FUNCTION public.guardian_can_access_turma(_turma_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
SET row_security = 'off'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM responsaveis r
    INNER JOIN crianca_responsavel cr ON cr.responsavel_id = r.id
    INNER JOIN crianca_turma ct ON ct.crianca_id = cr.crianca_id
    WHERE r.user_id = auth.uid()
      AND ct.turma_id = _turma_id
      AND ct.ativo = true
  )
$$;

-- 3. Function to check if current user (guardian) can access an escolinha
CREATE OR REPLACE FUNCTION public.guardian_can_access_escolinha(_escolinha_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
SET row_security = 'off'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM responsaveis r
    INNER JOIN crianca_responsavel cr ON cr.responsavel_id = r.id
    INNER JOIN crianca_escolinha ce ON ce.crianca_id = cr.crianca_id
    WHERE r.user_id = auth.uid()
      AND ce.escolinha_id = _escolinha_id
      AND ce.ativo = true
  )
$$;

-- 4. Function to check if school admin can access a specific crianca
CREATE OR REPLACE FUNCTION public.school_admin_can_access_crianca(_crianca_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
SET row_security = 'off'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM crianca_escolinha ce
    INNER JOIN escolinhas e ON e.id = ce.escolinha_id
    WHERE ce.crianca_id = _crianca_id
      AND e.admin_user_id = auth.uid()
  )
$$;

-- 5. Function to check if school admin can access a specific responsavel
CREATE OR REPLACE FUNCTION public.school_admin_can_access_responsavel(_responsavel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
SET row_security = 'off'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM crianca_responsavel cr
    INNER JOIN crianca_escolinha ce ON ce.crianca_id = cr.crianca_id
    INNER JOIN escolinhas e ON e.id = ce.escolinha_id
    WHERE cr.responsavel_id = _responsavel_id
      AND e.admin_user_id = auth.uid()
  )
$$;

-- 6. Update existing is_admin_of_escolinha to disable row_security
CREATE OR REPLACE FUNCTION public.is_admin_of_escolinha(_escolinha_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
SET row_security = 'off'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM escolinhas
    WHERE id = _escolinha_id
      AND admin_user_id = auth.uid()
  )
$$;

-- 7. Update existing is_teacher_of_escolinha to disable row_security
CREATE OR REPLACE FUNCTION public.is_teacher_of_escolinha(_escolinha_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
SET row_security = 'off'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM professores
    WHERE escolinha_id = _escolinha_id
      AND user_id = auth.uid()
      AND ativo = true
  )
$$;

-- 8. Update get_responsavel_id to disable row_security
CREATE OR REPLACE FUNCTION public.get_responsavel_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
SET row_security = 'off'
AS $$
  SELECT id FROM responsaveis WHERE user_id = _user_id LIMIT 1
$$;

-- ============================================
-- Now DROP and RECREATE RLS policies using the new functions
-- ============================================

-- ESCOLINHAS: Policy for guardians
DROP POLICY IF EXISTS "Responsaveis podem ver escolinhas dos filhos" ON escolinhas;
CREATE POLICY "Responsaveis podem ver escolinhas dos filhos"
ON escolinhas FOR SELECT
USING (
  CASE WHEN has_role(auth.uid(), 'guardian') 
  THEN guardian_can_access_escolinha(id)
  ELSE false END
);

-- CRIANCAS: Policy for guardians
DROP POLICY IF EXISTS "Responsaveis podem ver suas criancas" ON criancas;
CREATE POLICY "Responsaveis podem ver suas criancas"
ON criancas FOR SELECT
USING (guardian_owns_crianca(id));

-- TURMAS: Policy for guardians
DROP POLICY IF EXISTS "Responsaveis podem ver turmas dos filhos" ON turmas;
CREATE POLICY "Responsaveis podem ver turmas dos filhos"
ON turmas FOR SELECT
USING (
  CASE WHEN has_role(auth.uid(), 'guardian')
  THEN guardian_can_access_turma(id)
  ELSE false END
);

-- AULAS: Policy for guardians
DROP POLICY IF EXISTS "Responsaveis podem ver aulas das turmas dos filhos" ON aulas;
CREATE POLICY "Responsaveis podem ver aulas das turmas dos filhos"
ON aulas FOR SELECT
USING (guardian_can_access_turma(turma_id));

-- PRESENCAS: Policies for guardians
DROP POLICY IF EXISTS "Responsaveis podem ver e confirmar presenca dos filhos" ON presencas;
CREATE POLICY "Responsaveis podem ver e confirmar presenca dos filhos"
ON presencas FOR SELECT
USING (guardian_owns_crianca(crianca_id));

DROP POLICY IF EXISTS "Responsaveis podem atualizar confirmacao de presenca" ON presencas;
CREATE POLICY "Responsaveis podem atualizar confirmacao de presenca"
ON presencas FOR UPDATE
USING (guardian_owns_crianca(crianca_id))
WITH CHECK (guardian_owns_crianca(crianca_id));

DROP POLICY IF EXISTS "Responsaveis podem inserir presenca dos filhos" ON presencas;
CREATE POLICY "Responsaveis podem inserir presenca dos filhos"
ON presencas FOR INSERT
WITH CHECK (
  CASE WHEN has_role(auth.uid(), 'guardian')
  THEN guardian_owns_crianca(crianca_id)
  ELSE false END
);

-- CRIANCA_ESCOLINHA: Policy for guardians
DROP POLICY IF EXISTS "Responsaveis podem ver crianca_escolinha dos filhos" ON crianca_escolinha;
CREATE POLICY "Responsaveis podem ver crianca_escolinha dos filhos"
ON crianca_escolinha FOR SELECT
USING (
  CASE WHEN has_role(auth.uid(), 'guardian')
  THEN guardian_owns_crianca(crianca_id)
  ELSE false END
);

-- CRIANCA_TURMA: Policy for guardians
DROP POLICY IF EXISTS "Responsaveis podem ver turmas dos filhos" ON crianca_turma;
CREATE POLICY "Responsaveis podem ver turmas dos filhos"
ON crianca_turma FOR SELECT
USING (
  CASE WHEN has_role(auth.uid(), 'guardian')
  THEN guardian_owns_crianca(crianca_id)
  ELSE false END
);

-- CRIANCA_RESPONSAVEL: Policies
DROP POLICY IF EXISTS "Responsaveis podem ver seus vinculos" ON crianca_responsavel;
CREATE POLICY "Responsaveis podem ver seus vinculos"
ON crianca_responsavel FOR SELECT
USING (
  CASE WHEN has_role(auth.uid(), 'guardian')
  THEN responsavel_id = get_responsavel_id(auth.uid())
  ELSE false END
);

DROP POLICY IF EXISTS "Admins de escolinha podem gerenciar crianca-responsavel" ON crianca_responsavel;
CREATE POLICY "Admins de escolinha podem gerenciar crianca-responsavel"
ON crianca_responsavel FOR ALL
USING (school_admin_can_access_crianca(crianca_id))
WITH CHECK (school_admin_can_access_crianca(crianca_id));

-- RESPONSAVEIS: Policies for school admins
DROP POLICY IF EXISTS "Admins de escolinha podem ver responsaveis" ON responsaveis;
CREATE POLICY "Admins de escolinha podem ver responsaveis"
ON responsaveis FOR SELECT
USING (school_admin_can_access_responsavel(id));

DROP POLICY IF EXISTS "Admins de escolinha podem atualizar responsaveis" ON responsaveis;
CREATE POLICY "Admins de escolinha podem atualizar responsaveis"
ON responsaveis FOR UPDATE
USING (school_admin_can_access_responsavel(id))
WITH CHECK (school_admin_can_access_responsavel(id));

-- PROFESSORES: Policy for guardians
DROP POLICY IF EXISTS "Responsaveis podem ver professores das turmas dos filhos" ON professores;
CREATE POLICY "Responsaveis podem ver professores das turmas dos filhos"
ON professores FOR SELECT
USING (
  CASE WHEN has_role(auth.uid(), 'guardian')
  THEN EXISTS (
    SELECT 1 FROM turmas t
    WHERE t.professor_id = professores.id
      AND guardian_can_access_turma(t.id)
  )
  ELSE false END
);

-- MENSALIDADES: Policy for guardians
DROP POLICY IF EXISTS "Responsaveis podem ver mensalidades dos filhos" ON mensalidades;
CREATE POLICY "Responsaveis podem ver mensalidades dos filhos"
ON mensalidades FOR SELECT
USING (guardian_owns_crianca(crianca_id));
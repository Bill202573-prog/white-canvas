-- =====================================================
-- REMOVER TODAS AS POLICIES EXISTENTES DA CRIANCA_TURMA
-- =====================================================

DROP POLICY IF EXISTS "Admins de escolinha podem gerenciar crianca-turma" ON public.crianca_turma;
DROP POLICY IF EXISTS "Admins podem gerenciar vinculos crianca-turma" ON public.crianca_turma;
DROP POLICY IF EXISTS "Professores podem ver alunos das suas turmas" ON public.crianca_turma;
DROP POLICY IF EXISTS "Responsaveis podem ver turmas dos filhos" ON public.crianca_turma;

-- =====================================================
-- CRIAR POLICIES SIMPLES SEM RECURSÃO
-- =====================================================

-- SELECT liberado para qualquer usuário autenticado
CREATE POLICY "Usuarios autenticados podem ver vinculos"
ON public.crianca_turma
FOR SELECT
TO authenticated
USING (true);

-- INSERT/UPDATE/DELETE apenas para admin global
CREATE POLICY "Admins podem gerenciar vinculos crianca-turma"
ON public.crianca_turma
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin da escolinha pode gerenciar (usando is_admin_of_escolinha SEM subconsulta)
-- Precisamos criar uma versão que recebe turma_id diretamente
CREATE OR REPLACE FUNCTION public.is_admin_of_turma(p_turma_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM escolinhas e
    JOIN turmas t ON t.escolinha_id = e.id
    WHERE t.id = p_turma_id 
    AND e.admin_user_id = auth.uid()
  )
$$;

-- Admin da escolinha pode INSERT/UPDATE/DELETE
CREATE POLICY "Admins de escolinha podem gerenciar crianca-turma"
ON public.crianca_turma
FOR ALL
USING (public.is_admin_of_turma(turma_id))
WITH CHECK (public.is_admin_of_turma(turma_id));
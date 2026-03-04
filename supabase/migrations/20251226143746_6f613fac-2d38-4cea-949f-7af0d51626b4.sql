
-- =====================================================
-- AJUSTAR RLS DA TABELA TURMAS - REMOVER POLICY PROBLEMÁTICA
-- =====================================================

-- Remover a policy que causa loop
DROP POLICY IF EXISTS "Responsaveis podem ver turmas dos filhos" ON public.turmas;

-- Remover outras policies existentes para recriar de forma limpa
DROP POLICY IF EXISTS "Admins de escolinha podem gerenciar turmas da sua escolinha" ON public.turmas;
DROP POLICY IF EXISTS "Admins podem gerenciar todas as turmas" ON public.turmas;
DROP POLICY IF EXISTS "Professores podem ver suas turmas" ON public.turmas;

-- =====================================================
-- CRIAR POLICIES SIMPLES SEM RECURSÃO
-- =====================================================

-- SELECT liberado para qualquer usuário autenticado (sem subconsultas)
CREATE POLICY "Usuarios autenticados podem ver turmas"
ON public.turmas
FOR SELECT
TO authenticated
USING (true);

-- Admin global pode fazer tudo
CREATE POLICY "Admins podem gerenciar todas as turmas"
ON public.turmas
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin da escolinha pode gerenciar turmas da sua escolinha
CREATE POLICY "Admins de escolinha podem gerenciar turmas"
ON public.turmas
FOR ALL
USING (public.is_admin_of_escolinha(escolinha_id))
WITH CHECK (public.is_admin_of_escolinha(escolinha_id));

-- Professores podem ver suas turmas (consulta simples sem loop)
CREATE POLICY "Professores podem ver suas turmas"
ON public.turmas
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM professores p
    WHERE p.id = turmas.professor_id 
    AND p.user_id = auth.uid()
  )
);

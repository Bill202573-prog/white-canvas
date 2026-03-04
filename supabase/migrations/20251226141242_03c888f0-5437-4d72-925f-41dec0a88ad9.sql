
-- =====================================================
-- REMOVER TODAS AS POLICIES DA TABELA ESCOLINHAS
-- =====================================================

DROP POLICY IF EXISTS "Admins de escolinha podem atualizar sua escolinha" ON public.escolinhas;
DROP POLICY IF EXISTS "Admins de escolinha podem ver professores da sua escolinha" ON public.escolinhas;
DROP POLICY IF EXISTS "Admins de escolinha podem ver sua escolinha" ON public.escolinhas;
DROP POLICY IF EXISTS "Admins podem gerenciar escolinhas" ON public.escolinhas;
DROP POLICY IF EXISTS "Admins podem ver todas as escolinhas" ON public.escolinhas;
DROP POLICY IF EXISTS "Professores podem ver sua escolinha" ON public.escolinhas;
DROP POLICY IF EXISTS "Responsaveis podem ver escolinhas dos filhos" ON public.escolinhas;

-- =====================================================
-- CRIAR POLICIES SIMPLES (SEM JOINs COM OUTRAS TABELAS)
-- =====================================================

-- Admin do sistema pode fazer tudo
CREATE POLICY "Admins podem gerenciar escolinhas"
ON public.escolinhas
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin da escolinha pode ver e atualizar SUA escolinha (comparação direta, sem JOIN)
CREATE POLICY "Admin da escolinha pode ver sua escolinha"
ON public.escolinhas
FOR SELECT
USING (admin_user_id = auth.uid());

CREATE POLICY "Admin da escolinha pode atualizar sua escolinha"
ON public.escolinhas
FOR UPDATE
USING (admin_user_id = auth.uid())
WITH CHECK (admin_user_id = auth.uid());

-- Professores e Responsáveis: acesso via service_role ou através de outras tabelas
-- NÃO criar policies complexas aqui - o acesso será feito via funções SECURITY DEFINER


-- =====================================================
-- REMOVER TODAS AS POLICIES DA TABELA CRIANCA_TURMA
-- =====================================================

DROP POLICY IF EXISTS "Admins de escolinha podem gerenciar crianca-turma" ON public.crianca_turma;
DROP POLICY IF EXISTS "Admins podem gerenciar vinculos crianca-turma" ON public.crianca_turma;
DROP POLICY IF EXISTS "Professores podem ver alunos das suas turmas" ON public.crianca_turma;
DROP POLICY IF EXISTS "Responsaveis podem ver turmas dos filhos" ON public.crianca_turma;

-- =====================================================
-- CRIAR POLICIES SIMPLES (SEM JOINs COM OUTRAS TABELAS)
-- =====================================================

-- Admin do sistema pode fazer tudo
CREATE POLICY "Admins podem gerenciar vinculos crianca-turma"
ON public.crianca_turma
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin da escolinha pode gerenciar (usando função SECURITY DEFINER existente)
CREATE POLICY "Admins de escolinha podem gerenciar crianca-turma"
ON public.crianca_turma
FOR ALL
USING (public.is_admin_of_escolinha((SELECT escolinha_id FROM public.turmas WHERE id = crianca_turma.turma_id)))
WITH CHECK (public.is_admin_of_escolinha((SELECT escolinha_id FROM public.turmas WHERE id = crianca_turma.turma_id)));

-- Professores podem ver (usando função SECURITY DEFINER)
CREATE POLICY "Professores podem ver alunos das suas turmas"
ON public.crianca_turma
FOR SELECT
USING (public.is_teacher_of_escolinha((SELECT escolinha_id FROM public.turmas WHERE id = crianca_turma.turma_id)));

-- Responsáveis podem ver turmas dos filhos (usando função SECURITY DEFINER)
CREATE POLICY "Responsaveis podem ver turmas dos filhos"
ON public.crianca_turma
FOR SELECT
USING (
  CASE
    WHEN public.has_role(auth.uid(), 'guardian') THEN 
      crianca_id IN (SELECT public.get_criancas_do_responsavel(auth.uid()))
    ELSE false
  END
);

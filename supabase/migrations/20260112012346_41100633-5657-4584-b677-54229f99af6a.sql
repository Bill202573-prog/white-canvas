-- Corrigir política RLS para crianca_escolinha
-- Remover política antiga e criar nova com roles corretos
DROP POLICY IF EXISTS "Responsaveis podem ver crianca_escolinha dos filhos" ON public.crianca_escolinha;

CREATE POLICY "Responsaveis podem ver vinculos dos filhos" ON public.crianca_escolinha
  FOR SELECT
  TO authenticated
  USING (
    crianca_id IN (SELECT get_criancas_do_responsavel(auth.uid()))
  );

-- Também garantir que professores vejam as escolinhas dos alunos das turmas deles
CREATE POLICY "Professores podem ver vinculos dos alunos" ON public.crianca_escolinha
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM professores p
      JOIN turmas t ON t.professor_id = p.id
      JOIN crianca_turma ct ON ct.turma_id = t.id
      WHERE p.user_id = auth.uid()
        AND ct.crianca_id = crianca_escolinha.crianca_id
    )
  );
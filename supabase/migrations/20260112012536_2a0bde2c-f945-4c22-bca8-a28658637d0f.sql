-- Adicionar política RLS para que responsáveis vejam as escolinhas dos filhos
CREATE POLICY "Responsaveis podem ver escolinhas dos filhos" ON public.escolinhas
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT ce.escolinha_id 
      FROM crianca_escolinha ce
      WHERE ce.crianca_id IN (SELECT get_criancas_do_responsavel(auth.uid()))
    )
  );

-- Também permitir que professores vejam a escola deles
CREATE POLICY "Professores podem ver sua escolinha" ON public.escolinhas
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM professores p
      WHERE p.escolinha_id = escolinhas.id
        AND p.user_id = auth.uid()
    )
  );
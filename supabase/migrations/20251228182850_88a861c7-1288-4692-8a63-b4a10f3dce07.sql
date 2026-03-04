-- Allow guardians to see events their children participated in
CREATE POLICY "Responsaveis podem ver eventos dos filhos"
ON public.eventos_esportivos
FOR SELECT
USING (
  id IN (
    SELECT DISTINCT e.id
    FROM eventos_esportivos e
    JOIN evento_times et ON et.evento_id = e.id
    JOIN evento_time_alunos eta ON eta.time_id = et.id
    WHERE eta.crianca_id IN (SELECT get_criancas_do_responsavel(auth.uid()))
  )
);

-- Allow guardians to see teams their children are in
CREATE POLICY "Responsaveis podem ver times dos filhos"
ON public.evento_times
FOR SELECT
USING (
  id IN (
    SELECT eta.time_id
    FROM evento_time_alunos eta
    WHERE eta.crianca_id IN (SELECT get_criancas_do_responsavel(auth.uid()))
  )
);

-- Allow guardians to see their children's team participation
CREATE POLICY "Responsaveis podem ver participacao dos filhos"
ON public.evento_time_alunos
FOR SELECT
USING (
  crianca_id IN (SELECT get_criancas_do_responsavel(auth.uid()))
);

-- Allow guardians to see their children's goals
CREATE POLICY "Responsaveis podem ver gols dos filhos"
ON public.evento_gols
FOR SELECT
USING (
  crianca_id IN (SELECT get_criancas_do_responsavel(auth.uid()))
);

-- Allow guardians to see their children's awards
CREATE POLICY "Responsaveis podem ver premiacoes dos filhos"
ON public.evento_premiacoes
FOR SELECT
USING (
  crianca_id IN (SELECT get_criancas_do_responsavel(auth.uid()))
);
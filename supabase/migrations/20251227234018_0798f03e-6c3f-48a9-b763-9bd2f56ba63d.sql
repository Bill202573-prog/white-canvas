
-- Add SELECT policies for evento_time_alunos so school admins can read student participations
CREATE POLICY "School admins podem ver alunos dos times da escolinha"
ON public.evento_time_alunos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM evento_times et
    JOIN eventos_esportivos e ON e.id = et.evento_id
    JOIN escolinhas esc ON esc.id = e.escolinha_id
    WHERE et.id = evento_time_alunos.time_id 
    AND esc.admin_user_id = auth.uid()
  )
);

-- Add SELECT policies for evento_times so school admins can read teams
CREATE POLICY "School admins podem ver times da escolinha"
ON public.evento_times
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM eventos_esportivos e
    JOIN escolinhas esc ON esc.id = e.escolinha_id
    WHERE e.id = evento_times.evento_id 
    AND esc.admin_user_id = auth.uid()
  )
);

-- Add SELECT policies for evento_gols so school admins can read goals
CREATE POLICY "School admins podem ver gols da escolinha"
ON public.evento_gols
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM eventos_esportivos e
    JOIN escolinhas esc ON esc.id = e.escolinha_id
    WHERE e.id = evento_gols.evento_id 
    AND esc.admin_user_id = auth.uid()
  )
);

-- Add SELECT policies for evento_premiacoes so school admins can read awards
CREATE POLICY "School admins podem ver premiacoes da escolinha"
ON public.evento_premiacoes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM eventos_esportivos e
    JOIN escolinhas esc ON esc.id = e.escolinha_id
    WHERE e.id = evento_premiacoes.evento_id 
    AND esc.admin_user_id = auth.uid()
  )
);

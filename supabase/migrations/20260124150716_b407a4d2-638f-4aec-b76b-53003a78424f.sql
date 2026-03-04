-- Allow guardians to update their children's campeonato convocacoes (for confirming/declining)
CREATE POLICY "Guardians can update their children campeonato convocacoes"
ON public.campeonato_convocacoes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM crianca_responsavel cr
    JOIN responsaveis r ON r.id = cr.responsavel_id
    WHERE cr.crianca_id = campeonato_convocacoes.crianca_id
    AND r.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM crianca_responsavel cr
    JOIN responsaveis r ON r.id = cr.responsavel_id
    WHERE cr.crianca_id = campeonato_convocacoes.crianca_id
    AND r.user_id = auth.uid()
  )
);

-- Add comment
COMMENT ON POLICY "Guardians can update their children campeonato convocacoes" ON public.campeonato_convocacoes IS 'Allows guardians to confirm/decline championship registrations for their children';
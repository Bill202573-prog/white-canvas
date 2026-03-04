-- Add RLS policy for guardians to view campeonatos of schools their children attend
CREATE POLICY "Responsaveis podem ver campeonatos das escolinhas dos filhos"
ON public.campeonatos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM crianca_responsavel cr
    JOIN responsaveis r ON r.id = cr.responsavel_id
    JOIN crianca_escolinha ce ON ce.crianca_id = cr.crianca_id AND ce.ativo = true
    WHERE r.user_id = auth.uid()
    AND ce.escolinha_id = campeonatos.escolinha_id
  )
);

-- Add comment explaining the policy
COMMENT ON POLICY "Responsaveis podem ver campeonatos das escolinhas dos filhos" ON public.campeonatos IS 'Allows guardians to view championships from schools their children attend';
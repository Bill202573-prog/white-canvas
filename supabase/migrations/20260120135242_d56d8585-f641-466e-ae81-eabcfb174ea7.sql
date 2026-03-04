-- Allow guardians to update their children's amistoso convocations (for confirming or declining participation)
CREATE POLICY "Guardians can update their children amistoso convocations"
ON public.amistoso_convocacoes
FOR UPDATE
USING (guardian_owns_crianca(crianca_id))
WITH CHECK (guardian_owns_crianca(crianca_id));
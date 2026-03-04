
-- Allow authenticated users to INSERT criancas (for Carreira ID flow where parents create athlete profiles)
CREATE POLICY "Usuarios autenticados podem criar criancas"
ON public.criancas
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users who created a perfil_atleta linked to a crianca to SELECT that crianca
CREATE POLICY "Donos de perfil atleta podem ver sua crianca"
ON public.criancas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.perfil_atleta pa
    WHERE pa.crianca_id = criancas.id
    AND pa.user_id = auth.uid()
  )
);

-- Allow users who own the perfil_atleta to update their crianca
CREATE POLICY "Donos de perfil atleta podem atualizar sua crianca"
ON public.criancas
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.perfil_atleta pa
    WHERE pa.crianca_id = criancas.id
    AND pa.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.perfil_atleta pa
    WHERE pa.crianca_id = criancas.id
    AND pa.user_id = auth.uid()
  )
);

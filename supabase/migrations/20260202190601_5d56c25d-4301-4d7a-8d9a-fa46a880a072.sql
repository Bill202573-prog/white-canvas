-- Drop the existing policies that depend on atividade_id
DROP POLICY IF EXISTS "Users can upload activity photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their activity photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their activity photos" ON storage.objects;

-- Create new policies that check via crianca ownership
-- Users can upload photos for activities of their children
CREATE POLICY "Users can upload activity photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'atividade-externa-fotos' AND
  auth.uid() IS NOT NULL AND
  (
    -- Allow upload if the first folder is a crianca_id they own
    EXISTS (
      SELECT 1 FROM public.crianca_responsavel cr
      JOIN public.responsaveis r ON r.id = cr.responsavel_id
      WHERE r.user_id = auth.uid()
        AND cr.crianca_id::text = (storage.foldername(name))[1]
    )
    OR
    -- Or if it's an existing activity they created
    EXISTS (
      SELECT 1 FROM public.atividades_externas ae
      WHERE ae.id::text = (storage.foldername(name))[1]
      AND ae.criado_por = auth.uid()
    )
  )
);

-- Users can view photos of activities they created
CREATE POLICY "Users can view their activity photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'atividade-externa-fotos' AND
  auth.uid() IS NOT NULL AND
  (
    EXISTS (
      SELECT 1 FROM public.crianca_responsavel cr
      JOIN public.responsaveis r ON r.id = cr.responsavel_id
      WHERE r.user_id = auth.uid()
        AND cr.crianca_id::text = (storage.foldername(name))[1]
    )
    OR
    EXISTS (
      SELECT 1 FROM public.atividades_externas ae
      WHERE ae.id::text = (storage.foldername(name))[1]
      AND ae.criado_por = auth.uid()
    )
  )
);

-- Users can delete photos they uploaded
CREATE POLICY "Users can delete their activity photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'atividade-externa-fotos' AND
  auth.uid() IS NOT NULL AND
  (
    EXISTS (
      SELECT 1 FROM public.crianca_responsavel cr
      JOIN public.responsaveis r ON r.id = cr.responsavel_id
      WHERE r.user_id = auth.uid()
        AND cr.crianca_id::text = (storage.foldername(name))[1]
    )
    OR
    EXISTS (
      SELECT 1 FROM public.atividades_externas ae
      WHERE ae.id::text = (storage.foldername(name))[1]
      AND ae.criado_por = auth.uid()
    )
  )
);
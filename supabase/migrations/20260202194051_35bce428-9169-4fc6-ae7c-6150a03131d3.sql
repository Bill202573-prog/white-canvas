-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload activity photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their activity photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their activity photos" ON storage.objects;

-- Create simplified policies based on crianca_id folder structure
-- Path format: crianca_id/filename.ext

-- Users can upload photos for their children
CREATE POLICY "Users can upload activity photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'atividade-externa-fotos' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.crianca_responsavel cr
    JOIN public.responsaveis r ON r.id = cr.responsavel_id
    WHERE r.user_id = auth.uid()
      AND cr.crianca_id::text = (storage.foldername(name))[1]
  )
);

-- Users can view photos of their children
CREATE POLICY "Users can view their activity photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'atividade-externa-fotos' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.crianca_responsavel cr
    JOIN public.responsaveis r ON r.id = cr.responsavel_id
    WHERE r.user_id = auth.uid()
      AND cr.crianca_id::text = (storage.foldername(name))[1]
  )
);

-- Users can delete photos of their children
CREATE POLICY "Users can delete their activity photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'atividade-externa-fotos' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.crianca_responsavel cr
    JOIN public.responsaveis r ON r.id = cr.responsavel_id
    WHERE r.user_id = auth.uid()
      AND cr.crianca_id::text = (storage.foldername(name))[1]
  )
);
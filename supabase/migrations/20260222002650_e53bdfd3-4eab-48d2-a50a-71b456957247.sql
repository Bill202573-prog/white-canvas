
-- Add UPDATE policy for atleta-fotos (needed for upsert in profile photo upload)
CREATE POLICY "Usuarios podem atualizar sua propria foto"
ON storage.objects FOR UPDATE
USING (bucket_id = 'atleta-fotos' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'atleta-fotos' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- Add UPDATE policy for atleta-posts (in case of re-upload)
CREATE POLICY "Usuarios podem atualizar suas proprias imagens de post"
ON storage.objects FOR UPDATE
USING (bucket_id = 'atleta-posts' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'atleta-posts' AND (auth.uid())::text = (storage.foldername(name))[1]);

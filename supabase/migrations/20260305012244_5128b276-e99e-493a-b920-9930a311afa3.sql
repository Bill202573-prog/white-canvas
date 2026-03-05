-- Storage RLS policies for atleta-posts bucket
CREATE POLICY "atleta-posts: auth insert own folder" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'atleta-posts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "atleta-posts: public read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'atleta-posts');

CREATE POLICY "atleta-posts: owner update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'atleta-posts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "atleta-posts: owner delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'atleta-posts' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage RLS policies for atleta-fotos bucket
CREATE POLICY "atleta-fotos: auth insert own folder" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'atleta-fotos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "atleta-fotos: public read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'atleta-fotos');

CREATE POLICY "atleta-fotos: owner update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'atleta-fotos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "atleta-fotos: owner delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'atleta-fotos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage RLS policies for atividade-externa-fotos bucket
CREATE POLICY "atividade-externa-fotos: auth insert own folder" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'atividade-externa-fotos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "atividade-externa-fotos: auth read own folder" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'atividade-externa-fotos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "atividade-externa-fotos: owner update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'atividade-externa-fotos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "atividade-externa-fotos: owner delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'atividade-externa-fotos' AND (storage.foldername(name))[1] = auth.uid()::text);
-- Allow perfis_rede users to create posts via perfil_rede_id
CREATE POLICY "Perfis rede podem criar posts"
ON public.posts_atleta FOR INSERT
WITH CHECK (
  perfil_rede_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.perfis_rede
    WHERE id = posts_atleta.perfil_rede_id AND user_id = auth.uid()
  )
);

-- Allow perfis_rede users to view their own posts
CREATE POLICY "Perfis rede podem ver seus posts"
ON public.posts_atleta FOR SELECT
USING (
  perfil_rede_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.perfis_rede
    WHERE id = posts_atleta.perfil_rede_id AND user_id = auth.uid()
  )
);

-- Allow perfis_rede users to delete their own posts
CREATE POLICY "Perfis rede podem deletar seus posts"
ON public.posts_atleta FOR DELETE
USING (
  perfil_rede_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.perfis_rede
    WHERE id = posts_atleta.perfil_rede_id AND user_id = auth.uid()
  )
);

-- Allow public viewing of perfis_rede posts
CREATE POLICY "Posts publicos de perfis rede"
ON public.posts_atleta FOR SELECT
USING (
  visibilidade = 'publico' AND perfil_rede_id IS NOT NULL
);

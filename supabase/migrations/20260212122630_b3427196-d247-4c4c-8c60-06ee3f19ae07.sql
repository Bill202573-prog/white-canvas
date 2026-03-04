
-- Allow admin to view all posts
CREATE POLICY "Admins podem ver todos os posts"
ON public.posts_atleta
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

-- Allow admin to delete any post
CREATE POLICY "Admins podem deletar qualquer post"
ON public.posts_atleta
FOR DELETE
USING (has_role(auth.uid(), 'admin'::user_role));

-- Allow admin to view all perfil_atleta
CREATE POLICY "Admins podem ver todos os perfis atleta"
ON public.perfil_atleta
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

-- Allow admin to update any perfil_atleta (for blocking)
CREATE POLICY "Admins podem atualizar qualquer perfil atleta"
ON public.perfil_atleta
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::user_role));

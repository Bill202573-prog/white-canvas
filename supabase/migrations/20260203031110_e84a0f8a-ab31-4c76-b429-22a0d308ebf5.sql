-- =============================================
-- ATLETA ID - MVP Social Tables
-- Separado do app principal de escolinhas
-- =============================================

-- 1. Perfil Público do Atleta
CREATE TABLE public.perfil_atleta (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  foto_url TEXT,
  modalidade TEXT NOT NULL DEFAULT 'futebol',
  categoria TEXT, -- sub-11, sub-13, etc
  cidade TEXT,
  estado TEXT,
  bio TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for slug lookup
CREATE INDEX idx_perfil_atleta_slug ON public.perfil_atleta(slug);
CREATE INDEX idx_perfil_atleta_user_id ON public.perfil_atleta(user_id);

-- Enable RLS
ALTER TABLE public.perfil_atleta ENABLE ROW LEVEL SECURITY;

-- RLS Policies for perfil_atleta
-- Public profiles can be viewed by anyone
CREATE POLICY "Perfis publicos podem ser visualizados por todos"
ON public.perfil_atleta
FOR SELECT
USING (is_public = true);

-- Users can view their own profile
CREATE POLICY "Usuarios podem ver seu proprio perfil"
ON public.perfil_atleta
FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own profile
CREATE POLICY "Usuarios podem criar seu proprio perfil"
ON public.perfil_atleta
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Usuarios podem atualizar seu proprio perfil"
ON public.perfil_atleta
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own profile
CREATE POLICY "Usuarios podem deletar seu proprio perfil"
ON public.perfil_atleta
FOR DELETE
USING (user_id = auth.uid());

-- 2. Posts do Atleta (Social Feed)
CREATE TABLE public.posts_atleta (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  autor_id UUID NOT NULL REFERENCES public.perfil_atleta(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  imagens_urls TEXT[] DEFAULT '{}',
  visibilidade TEXT NOT NULL DEFAULT 'publico',
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for timeline queries
CREATE INDEX idx_posts_atleta_autor ON public.posts_atleta(autor_id);
CREATE INDEX idx_posts_atleta_created ON public.posts_atleta(created_at DESC);

-- Enable RLS
ALTER TABLE public.posts_atleta ENABLE ROW LEVEL SECURITY;

-- RLS Policies for posts_atleta
-- Public posts can be viewed by anyone
CREATE POLICY "Posts publicos podem ser visualizados por todos"
ON public.posts_atleta
FOR SELECT
USING (
  visibilidade = 'publico' 
  AND EXISTS (
    SELECT 1 FROM public.perfil_atleta 
    WHERE id = posts_atleta.autor_id 
    AND is_public = true
  )
);

-- Authors can view their own posts (including private ones)
CREATE POLICY "Autores podem ver seus proprios posts"
ON public.posts_atleta
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.perfil_atleta 
    WHERE id = posts_atleta.autor_id 
    AND user_id = auth.uid()
  )
);

-- Authors can insert posts
CREATE POLICY "Autores podem criar posts"
ON public.posts_atleta
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.perfil_atleta 
    WHERE id = posts_atleta.autor_id 
    AND user_id = auth.uid()
  )
);

-- Authors can update their own posts
CREATE POLICY "Autores podem atualizar seus posts"
ON public.posts_atleta
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.perfil_atleta 
    WHERE id = posts_atleta.autor_id 
    AND user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.perfil_atleta 
    WHERE id = posts_atleta.autor_id 
    AND user_id = auth.uid()
  )
);

-- Authors can delete their own posts
CREATE POLICY "Autores podem deletar seus posts"
ON public.posts_atleta
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.perfil_atleta 
    WHERE id = posts_atleta.autor_id 
    AND user_id = auth.uid()
  )
);

-- 3. Likes nos Posts (opcional mas simples)
CREATE TABLE public.post_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts_atleta(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX idx_post_likes_post ON public.post_likes(post_id);
CREATE INDEX idx_post_likes_user ON public.post_likes(user_id);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

-- RLS for likes
CREATE POLICY "Qualquer um pode ver likes de posts publicos"
ON public.post_likes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.posts_atleta p
    JOIN public.perfil_atleta pf ON pf.id = p.autor_id
    WHERE p.id = post_likes.post_id
    AND p.visibilidade = 'publico'
    AND pf.is_public = true
  )
);

CREATE POLICY "Usuarios autenticados podem curtir"
ON public.post_likes
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuarios podem remover seu like"
ON public.post_likes
FOR DELETE
USING (user_id = auth.uid());

-- 4. Trigger to update likes_count
CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts_atleta SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts_atleta SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_likes_count
AFTER INSERT OR DELETE ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();

-- 5. Trigger for updated_at
CREATE TRIGGER update_perfil_atleta_updated_at
BEFORE UPDATE ON public.perfil_atleta
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_posts_atleta_updated_at
BEFORE UPDATE ON public.posts_atleta
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Create storage bucket for athlete posts images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('atleta-posts', 'atleta-posts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for atleta-posts bucket
CREATE POLICY "Imagens de posts sao publicas"
ON storage.objects FOR SELECT
USING (bucket_id = 'atleta-posts');

CREATE POLICY "Usuarios autenticados podem fazer upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'atleta-posts' AND auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios podem deletar suas proprias imagens"
ON storage.objects FOR DELETE
USING (bucket_id = 'atleta-posts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 7. Create storage bucket for athlete profile photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('atleta-fotos', 'atleta-fotos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Fotos de perfil sao publicas"
ON storage.objects FOR SELECT
USING (bucket_id = 'atleta-fotos');

CREATE POLICY "Usuarios autenticados podem fazer upload de foto"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'atleta-fotos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios podem deletar sua propria foto"
ON storage.objects FOR DELETE
USING (bucket_id = 'atleta-fotos' AND auth.uid()::text = (storage.foldername(name))[1]);
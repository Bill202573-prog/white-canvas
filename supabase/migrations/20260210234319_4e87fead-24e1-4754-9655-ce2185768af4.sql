
-- Comments table
CREATE TABLE public.post_comentarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts_atleta(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.post_comentarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comments" ON public.post_comentarios FOR SELECT USING (true);
CREATE POLICY "Authenticated users can comment" ON public.post_comentarios FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON public.post_comentarios FOR DELETE USING (auth.uid() = user_id);

-- Add comments_count to posts_atleta
ALTER TABLE public.posts_atleta ADD COLUMN IF NOT EXISTS comments_count INTEGER NOT NULL DEFAULT 0;

-- Trigger for comments count
CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts_atleta SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts_atleta SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_comments_count
AFTER INSERT OR DELETE ON public.post_comentarios
FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();

-- Follows table
CREATE TABLE public.atleta_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_perfil_id UUID NOT NULL REFERENCES public.perfil_atleta(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_perfil_id)
);

ALTER TABLE public.atleta_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can see follows" ON public.atleta_follows FOR SELECT USING (true);
CREATE POLICY "Authenticated users can follow" ON public.atleta_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.atleta_follows FOR DELETE USING (auth.uid() = follower_id);

-- Add followers/following count to perfil_atleta
ALTER TABLE public.perfil_atleta ADD COLUMN IF NOT EXISTS followers_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.perfil_atleta ADD COLUMN IF NOT EXISTS conexoes_count INTEGER NOT NULL DEFAULT 0;

-- Trigger for followers count
CREATE OR REPLACE FUNCTION public.update_followers_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.perfil_atleta SET followers_count = followers_count + 1 WHERE id = NEW.following_perfil_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.perfil_atleta SET followers_count = GREATEST(0, followers_count - 1) WHERE id = OLD.following_perfil_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_followers_count_trigger
AFTER INSERT OR DELETE ON public.atleta_follows
FOR EACH ROW EXECUTE FUNCTION public.update_followers_count();

-- Enable realtime for comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comentarios;

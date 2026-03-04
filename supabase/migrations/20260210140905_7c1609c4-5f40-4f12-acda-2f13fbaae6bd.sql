
-- Create posts_escola table for school publications
CREATE TABLE public.posts_escola (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escolinha_id UUID NOT NULL REFERENCES public.escolinhas(id) ON DELETE CASCADE,
  autor_user_id UUID NOT NULL,
  texto TEXT NOT NULL DEFAULT '',
  imagens_urls TEXT[] NOT NULL DEFAULT '{}',
  visibilidade TEXT NOT NULL DEFAULT 'publico',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.posts_escola ENABLE ROW LEVEL SECURITY;

-- Public can read published posts
CREATE POLICY "Anyone can read public escola posts"
  ON public.posts_escola FOR SELECT
  USING (visibilidade = 'publico');

-- School admin can insert posts
CREATE POLICY "School admin can create posts"
  ON public.posts_escola FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.escolinhas
      WHERE id = escolinha_id
      AND (admin_user_id = auth.uid() OR socio_user_id = auth.uid())
    )
  );

-- School admin can delete their posts
CREATE POLICY "School admin can delete posts"
  ON public.posts_escola FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.escolinhas
      WHERE id = escolinha_id
      AND (admin_user_id = auth.uid() OR socio_user_id = auth.uid())
    )
  );

-- School admin can update their posts
CREATE POLICY "School admin can update posts"
  ON public.posts_escola FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.escolinhas
      WHERE id = escolinha_id
      AND (admin_user_id = auth.uid() OR socio_user_id = auth.uid())
    )
  );

-- Create storage bucket for school post images
INSERT INTO storage.buckets (id, name, public) VALUES ('escola-posts', 'escola-posts', true);

-- Storage policies
CREATE POLICY "Anyone can view escola post images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'escola-posts');

CREATE POLICY "School admins can upload escola post images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'escola-posts' AND auth.role() = 'authenticated');

CREATE POLICY "School admins can delete escola post images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'escola-posts' AND auth.role() = 'authenticated');

-- Index for performance
CREATE INDEX idx_posts_escola_escolinha_id ON public.posts_escola(escolinha_id);
CREATE INDEX idx_posts_escola_created_at ON public.posts_escola(created_at DESC);

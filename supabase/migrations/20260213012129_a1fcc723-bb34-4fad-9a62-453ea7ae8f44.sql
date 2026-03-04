-- Add support for professional profiles posting
-- autor_id currently points to perfil_atleta.id; we add an optional perfil_rede_id
ALTER TABLE public.posts_atleta ADD COLUMN IF NOT EXISTS perfil_rede_id UUID REFERENCES public.perfis_rede(id) ON DELETE CASCADE;

-- Make autor_id nullable so professional profiles can post without a perfil_atleta
ALTER TABLE public.posts_atleta ALTER COLUMN autor_id DROP NOT NULL;

-- Add link preview metadata columns
ALTER TABLE public.posts_atleta ADD COLUMN IF NOT EXISTS link_preview JSONB DEFAULT NULL;

-- Index for querying posts by perfil_rede_id
CREATE INDEX IF NOT EXISTS idx_posts_atleta_perfil_rede ON public.posts_atleta(perfil_rede_id) WHERE perfil_rede_id IS NOT NULL;

-- Add instagram_url to escolinhas
ALTER TABLE public.escolinhas ADD COLUMN IF NOT EXISTS instagram_url text;

-- Update the public view to include instagram_url
DROP VIEW IF EXISTS public.escolinhas_publico;
CREATE VIEW public.escolinhas_publico AS
  SELECT id, nome, slug, bio, cidade, estado, logo_url, instagram_url
  FROM public.escolinhas
  WHERE slug IS NOT NULL AND ativo = true;
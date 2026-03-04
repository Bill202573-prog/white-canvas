
-- Add slug and bio to escolinhas for public profile pages
ALTER TABLE public.escolinhas 
ADD COLUMN IF NOT EXISTS slug text UNIQUE,
ADD COLUMN IF NOT EXISTS bio text;

-- Generate slugs for existing schools
UPDATE public.escolinhas 
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      translate(nome, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiioooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'),
      '[^a-zA-Z0-9]+', '-', 'g'
    ),
    '(^-|-$)', '', 'g'
  )
) || '-' || LEFT(gen_random_uuid()::text, 6)
WHERE slug IS NULL;

-- Drop and recreate the public view to include slug and bio
DROP VIEW IF EXISTS public.escolinhas_publico;
CREATE VIEW public.escolinhas_publico 
WITH (security_invoker = false)
AS
SELECT id, nome, logo_url, cidade, estado, slug, bio
FROM public.escolinhas
WHERE ativo = true;

-- Grant access
GRANT SELECT ON public.escolinhas_publico TO anon, authenticated;

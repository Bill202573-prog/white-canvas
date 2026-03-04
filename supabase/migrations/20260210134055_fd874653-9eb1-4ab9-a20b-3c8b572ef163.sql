
-- Recreate view with all needed columns
DROP VIEW IF EXISTS public.escolinhas_publico;
CREATE VIEW public.escolinhas_publico 
WITH (security_invoker = false)
AS
SELECT id, nome, logo_url, cidade, estado, slug, bio, telefone, whatsapp_indicacoes
FROM public.escolinhas
WHERE ativo = true;

GRANT SELECT ON public.escolinhas_publico TO anon, authenticated;

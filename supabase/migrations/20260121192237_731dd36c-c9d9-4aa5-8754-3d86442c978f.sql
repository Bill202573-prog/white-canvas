-- Fix security definer view by recreating with explicit security settings
DROP VIEW IF EXISTS public.responsaveis_publico;

CREATE VIEW public.responsaveis_publico 
WITH (security_invoker = true) AS
SELECT 
  id,
  nome
FROM public.responsaveis
WHERE ativo = true;

-- Grant access to authenticated and anon users
GRANT SELECT ON public.responsaveis_publico TO anon;
GRANT SELECT ON public.responsaveis_publico TO authenticated;
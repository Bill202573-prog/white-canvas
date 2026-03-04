-- Create a public view for responsaveis to be used in public referral page
CREATE OR REPLACE VIEW public.responsaveis_publico AS
SELECT 
  id,
  nome
FROM public.responsaveis
WHERE ativo = true;

-- Grant access to authenticated and anon users
GRANT SELECT ON public.responsaveis_publico TO anon;
GRANT SELECT ON public.responsaveis_publico TO authenticated;
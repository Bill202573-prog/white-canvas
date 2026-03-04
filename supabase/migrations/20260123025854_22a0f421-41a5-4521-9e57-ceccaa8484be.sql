-- Fix public referral flow: allow unauthenticated users to read safe public views
-- The /indicacao page reads from escolinhas_publico and responsaveis_publico without login.

-- Ensure the public views run with view-owner privileges (so underlying table RLS doesn't block anon)
ALTER VIEW public.escolinhas_publico SET (security_invoker = false);
ALTER VIEW public.responsaveis_publico SET (security_invoker = false);

-- Grant read access on the views to unauthenticated and authenticated users
GRANT SELECT ON public.escolinhas_publico TO anon, authenticated;
GRANT SELECT ON public.responsaveis_publico TO anon, authenticated;
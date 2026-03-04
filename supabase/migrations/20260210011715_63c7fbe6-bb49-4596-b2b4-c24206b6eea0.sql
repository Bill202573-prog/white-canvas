-- Remove the recursive policy on escolinhas that is causing infinite recursion
-- We don't need this policy because the Carreira hook uses the escolinhas_publico view (SECURITY DEFINER)
DROP POLICY IF EXISTS "Public can view escolinhas for public profile children" ON public.escolinhas;
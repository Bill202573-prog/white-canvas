
-- Fix permissive INSERT policy on rede_convites
DROP POLICY IF EXISTS "Anyone can insert convites" ON public.rede_convites;
CREATE POLICY "Auth users can insert convites"
  ON public.rede_convites FOR INSERT
  WITH CHECK (auth.uid() = convidado_user_id);

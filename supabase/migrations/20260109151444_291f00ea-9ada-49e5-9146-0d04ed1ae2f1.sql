-- Evitar recursão infinita em SELECT de profiles
-- A policy atual de profiles referencia a tabela professores (com RLS), o que pode gerar recursão.

CREATE OR REPLACE FUNCTION public.school_admin_can_access_profile(_profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.escolinhas e
    WHERE e.admin_user_id = auth.uid()
      AND (
        EXISTS (
          SELECT 1
          FROM public.professores p
          WHERE p.user_id = _profile_user_id
            AND p.escolinha_id = e.id
        )
        OR EXISTS (
          SELECT 1
          FROM public.responsaveis r
          JOIN public.crianca_responsavel cr ON cr.responsavel_id = r.id
          JOIN public.crianca_escolinha ce ON ce.crianca_id = cr.crianca_id
          WHERE r.user_id = _profile_user_id
            AND ce.escolinha_id = e.id
            AND ce.ativo = true
        )
      )
  );
$$;

DROP POLICY IF EXISTS "School admins can view related profiles" ON public.profiles;

CREATE POLICY "School admins can view related profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.school_admin_can_access_profile(profiles.user_id));


-- Fix infinite recursion in eventos_esportivos public policy
-- The current policy joins amistoso_convocacoes and campeonato_convocacoes,
-- which themselves join back to eventos_esportivos via their RLS policies, causing infinite recursion.

-- Drop the problematic policy
DROP POLICY IF EXISTS "Public can view eventos of public profile children" ON public.eventos_esportivos;

-- Create a new policy that avoids the circular reference by using a security definer function
CREATE OR REPLACE FUNCTION public.evento_has_public_profile_child(p_evento_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM amistoso_convocacoes ac
    WHERE ac.evento_id = p_evento_id
      AND crianca_has_public_profile(ac.crianca_id, 'amistosos')
  ) OR EXISTS (
    SELECT 1 FROM campeonato_convocacoes cc
    JOIN campeonatos c ON c.id = cc.campeonato_id
    WHERE c.id IN (SELECT ee.campeonato_id FROM eventos_esportivos ee WHERE ee.id = p_evento_id)
      AND crianca_has_public_profile(cc.crianca_id, 'campeonatos')
  );
$$;

-- Recreate the policy using the security definer function (bypasses RLS on inner tables)
CREATE POLICY "Public can view eventos of public profile children"
ON public.eventos_esportivos
FOR SELECT
USING (evento_has_public_profile_child(id));

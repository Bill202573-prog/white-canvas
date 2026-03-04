
-- Fix evento_has_public_profile_child to also check evento_gols and evento_premiacoes
CREATE OR REPLACE FUNCTION public.evento_has_public_profile_child(p_evento_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM amistoso_convocacoes ac
    WHERE ac.evento_id = p_evento_id
      AND crianca_has_public_profile(ac.crianca_id, 'amistosos')
  ) OR EXISTS (
    SELECT 1 FROM campeonato_convocacoes cc
    JOIN campeonatos c ON c.id = cc.campeonato_id
    WHERE c.id IN (SELECT ee.campeonato_id FROM eventos_esportivos ee WHERE ee.id = p_evento_id)
      AND crianca_has_public_profile(cc.crianca_id, 'campeonatos')
  ) OR EXISTS (
    SELECT 1 FROM evento_gols eg
    WHERE eg.evento_id = p_evento_id
      AND crianca_has_public_profile(eg.crianca_id, 'gols')
  ) OR EXISTS (
    SELECT 1 FROM evento_premiacoes ep
    WHERE ep.evento_id = p_evento_id
      AND crianca_has_public_profile(ep.crianca_id, 'premiacoes')
  );
$function$;

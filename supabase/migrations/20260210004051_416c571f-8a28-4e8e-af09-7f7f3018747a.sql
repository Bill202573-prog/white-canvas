
-- Allow public SELECT on crianca_escolinha for children with public profiles
CREATE POLICY "Public can view escolinha links for public profiles"
  ON public.crianca_escolinha
  FOR SELECT
  USING (
    crianca_has_public_profile(crianca_id, 'campeonatos')
    OR crianca_has_public_profile(crianca_id, 'gols')
    OR crianca_has_public_profile(crianca_id, 'amistosos')
    OR crianca_has_public_profile(crianca_id, 'premiacoes')
    OR crianca_has_public_profile(crianca_id, 'conquistas')
  );

-- Allow public SELECT on escolinhas for schools linked to public profile children
CREATE POLICY "Public can view escolinhas for public profile children"
  ON public.escolinhas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM crianca_escolinha ce
      WHERE ce.escolinha_id = id
      AND (
        crianca_has_public_profile(ce.crianca_id, 'campeonatos')
        OR crianca_has_public_profile(ce.crianca_id, 'gols')
      )
    )
  );

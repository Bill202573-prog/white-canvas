
-- Add dados_publicos JSONB field to perfil_atleta for controlling public visibility
ALTER TABLE public.perfil_atleta 
ADD COLUMN IF NOT EXISTS dados_publicos jsonb NOT NULL DEFAULT '{"gols": true, "campeonatos": true, "amistosos": true, "premiacoes": true, "conquistas": true}'::jsonb;

-- Create a security definer function to check if a crianca has a public profile with specific data enabled
CREATE OR REPLACE FUNCTION public.crianca_has_public_profile(p_crianca_id uuid, p_data_type text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfil_atleta
    WHERE crianca_id = p_crianca_id
      AND is_public = true
      AND (p_data_type IS NULL OR (dados_publicos->>p_data_type)::boolean = true)
  )
$$;

-- RLS policy for evento_gols: allow public SELECT when crianca has public profile with gols enabled
CREATE POLICY "Public can view gols of public profiles"
ON public.evento_gols
FOR SELECT
USING (crianca_has_public_profile(crianca_id, 'gols'));

-- RLS policy for amistoso_convocacoes: allow public SELECT when crianca has public profile with amistosos enabled
CREATE POLICY "Public can view amistoso convocacoes of public profiles"
ON public.amistoso_convocacoes
FOR SELECT
USING (crianca_has_public_profile(crianca_id, 'amistosos'));

-- RLS policy for campeonato_convocacoes: allow public SELECT when crianca has public profile with campeonatos enabled
CREATE POLICY "Public can view campeonato convocacoes of public profiles"
ON public.campeonato_convocacoes
FOR SELECT
USING (crianca_has_public_profile(crianca_id, 'campeonatos'));

-- RLS policy for evento_premiacoes: allow public SELECT when crianca has public profile with premiacoes enabled
CREATE POLICY "Public can view premiacoes of public profiles"
ON public.evento_premiacoes
FOR SELECT
USING (crianca_has_public_profile(crianca_id, 'premiacoes'));

-- RLS policy for conquistas_coletivas: already has "Todos podem ver conquistas" policy allowing public SELECT
-- No additional policy needed

-- RLS policy for eventos_esportivos: allow public SELECT when linked to a public profile child
CREATE POLICY "Public can view eventos of public profile children"
ON public.eventos_esportivos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.amistoso_convocacoes ac
    WHERE ac.evento_id = eventos_esportivos.id
      AND crianca_has_public_profile(ac.crianca_id, 'amistosos')
  )
  OR
  EXISTS (
    SELECT 1 FROM public.campeonato_convocacoes cc
    JOIN public.campeonatos c ON c.id = cc.campeonato_id
    WHERE c.id = eventos_esportivos.campeonato_id
      AND crianca_has_public_profile(cc.crianca_id, 'campeonatos')
  )
);

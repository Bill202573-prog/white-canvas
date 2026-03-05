
-- 1. Add foreign key from posts_atleta.autor_id to perfil_atleta.id
ALTER TABLE public.posts_atleta
  ADD CONSTRAINT posts_atleta_autor_id_fkey
  FOREIGN KEY (autor_id) REFERENCES public.perfil_atleta(id) ON DELETE CASCADE;

-- 2. Add foreign key from posts_atleta.perfil_rede_id to perfis_rede.id
ALTER TABLE public.posts_atleta
  ADD CONSTRAINT posts_atleta_perfil_rede_id_fkey
  FOREIGN KEY (perfil_rede_id) REFERENCES public.perfis_rede(id) ON DELETE CASCADE;

-- 3. Create crianca_escolinha table (needed by useEscolinhasCarreira)
CREATE TABLE IF NOT EXISTS public.crianca_escolinha (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crianca_id uuid NOT NULL,
  escolinha_id uuid NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  data_inicio date NOT NULL DEFAULT CURRENT_DATE,
  data_fim date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crianca_escolinha ENABLE ROW LEVEL SECURITY;

-- RLS: owners can view via perfil_atleta link
CREATE POLICY "Users can view own crianca_escolinha"
  ON public.crianca_escolinha FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfil_atleta
      WHERE perfil_atleta.crianca_id = crianca_escolinha.crianca_id
        AND perfil_atleta.user_id = auth.uid()
    )
  );

-- Public profiles can have their escolinhas viewed
CREATE POLICY "Public crianca_escolinha viewable"
  ON public.crianca_escolinha FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfil_atleta
      WHERE perfil_atleta.crianca_id = crianca_escolinha.crianca_id
        AND perfil_atleta.is_public = true
    )
  );

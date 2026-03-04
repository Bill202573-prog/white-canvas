
-- Tabela principal de perfis da rede social Atleta ID
CREATE TABLE public.perfis_rede (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'professor', 'tecnico', 'dono_escola', 'preparador_fisico',
    'empresario', 'influenciador', 'pai_responsavel', 'scout',
    'agente_clube', 'fotografo'
  )),
  nome TEXT NOT NULL,
  foto_url TEXT,
  bio TEXT,
  instagram TEXT,
  slug TEXT UNIQUE,
  dados_perfil JSONB NOT NULL DEFAULT '{}',
  convite_codigo TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_perfis_rede_tipo ON public.perfis_rede(tipo);
CREATE INDEX idx_perfis_rede_slug ON public.perfis_rede(slug);
CREATE INDEX idx_perfis_rede_convite ON public.perfis_rede(convite_codigo);

-- Enable RLS
ALTER TABLE public.perfis_rede ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Anyone can view perfis_rede"
  ON public.perfis_rede FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own perfil_rede"
  ON public.perfis_rede FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own perfil_rede"
  ON public.perfis_rede FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own perfil_rede"
  ON public.perfis_rede FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_perfis_rede_updated_at
  BEFORE UPDATE ON public.perfis_rede
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para gerar slug único a partir do nome
CREATE OR REPLACE FUNCTION public.generate_perfil_rede_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  new_slug TEXT;
  counter INTEGER := 0;
BEGIN
  base_slug := lower(regexp_replace(unaccent(NEW.nome), '[^a-z0-9]+', '-', 'gi'));
  base_slug := trim(both '-' from base_slug);
  new_slug := base_slug;
  
  WHILE EXISTS (SELECT 1 FROM public.perfis_rede WHERE slug = new_slug AND id != NEW.id) LOOP
    counter := counter + 1;
    new_slug := base_slug || '-' || counter;
  END LOOP;
  
  NEW.slug := new_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER generate_perfil_rede_slug_trigger
  BEFORE INSERT ON public.perfis_rede
  FOR EACH ROW
  WHEN (NEW.slug IS NULL)
  EXECUTE FUNCTION public.generate_perfil_rede_slug();

-- Tabela de convites/conexões (para fase de convites)
CREATE TABLE public.rede_conexoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitante_id UUID NOT NULL,
  destinatario_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceita', 'recusada')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(solicitante_id, destinatario_id)
);

ALTER TABLE public.rede_conexoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conexoes"
  ON public.rede_conexoes FOR SELECT
  USING (auth.uid() = solicitante_id OR auth.uid() = destinatario_id);

CREATE POLICY "Auth users can create conexoes"
  ON public.rede_conexoes FOR INSERT
  WITH CHECK (auth.uid() = solicitante_id);

CREATE POLICY "Users can update conexoes they received"
  ON public.rede_conexoes FOR UPDATE
  USING (auth.uid() = destinatario_id);

CREATE POLICY "Users can delete own conexoes"
  ON public.rede_conexoes FOR DELETE
  USING (auth.uid() = solicitante_id OR auth.uid() = destinatario_id);

CREATE TRIGGER update_rede_conexoes_updated_at
  BEFORE UPDATE ON public.rede_conexoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela para vincular convites (quem convidou quem)
CREATE TABLE public.rede_convites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  convidante_perfil_id UUID NOT NULL REFERENCES public.perfis_rede(id) ON DELETE CASCADE,
  convidado_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(convidante_perfil_id, convidado_user_id)
);

ALTER TABLE public.rede_convites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert convites"
  ON public.rede_convites FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own convites"
  ON public.rede_convites FOR SELECT
  USING (auth.uid() = convidado_user_id OR EXISTS (
    SELECT 1 FROM public.perfis_rede WHERE id = convidante_perfil_id AND user_id = auth.uid()
  ));

-- Enable realtime for conexoes
ALTER PUBLICATION supabase_realtime ADD TABLE public.rede_conexoes;

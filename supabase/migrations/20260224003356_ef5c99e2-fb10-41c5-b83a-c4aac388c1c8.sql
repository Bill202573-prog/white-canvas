
-- Table for athlete training/school experiences (Carreira curriculum)
CREATE TABLE public.carreira_experiencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crianca_id UUID NOT NULL REFERENCES public.criancas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  nome_escola TEXT NOT NULL,
  escolinha_id UUID REFERENCES public.escolinhas(id) ON DELETE SET NULL,
  data_inicio TEXT NOT NULL,
  data_fim TEXT,
  atual BOOLEAN NOT NULL DEFAULT false,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.carreira_experiencias ENABLE ROW LEVEL SECURITY;

-- Owner can CRUD their own experiences
CREATE POLICY "Users can view experiences of their children"
  ON public.carreira_experiencias FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own experiences"
  ON public.carreira_experiencias FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own experiences"
  ON public.carreira_experiencias FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own experiences"
  ON public.carreira_experiencias FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_carreira_experiencias_updated_at
  BEFORE UPDATE ON public.carreira_experiencias
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

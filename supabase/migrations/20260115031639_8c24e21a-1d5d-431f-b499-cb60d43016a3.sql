-- Add valor column to campeonatos table
ALTER TABLE public.campeonatos
ADD COLUMN valor NUMERIC(10, 2) DEFAULT NULL;

-- Create table for championship convocations (athlete call-ups)
CREATE TABLE public.campeonato_convocacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campeonato_id UUID NOT NULL REFERENCES public.campeonatos(id) ON DELETE CASCADE,
  crianca_id UUID NOT NULL REFERENCES public.criancas(id) ON DELETE CASCADE,
  valor NUMERIC(10, 2) DEFAULT NULL,
  isento BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(50) NOT NULL DEFAULT 'convocado',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campeonato_id, crianca_id)
);

-- Enable RLS
ALTER TABLE public.campeonato_convocacoes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for school admins
CREATE POLICY "School admins can view convocacoes"
ON public.campeonato_convocacoes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.campeonatos c
    JOIN public.escolinhas e ON e.id = c.escolinha_id
    WHERE c.id = campeonato_id
    AND e.admin_user_id = auth.uid()
  )
);

CREATE POLICY "School admins can insert convocacoes"
ON public.campeonato_convocacoes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.campeonatos c
    JOIN public.escolinhas e ON e.id = c.escolinha_id
    WHERE c.id = campeonato_id
    AND e.admin_user_id = auth.uid()
  )
);

CREATE POLICY "School admins can update convocacoes"
ON public.campeonato_convocacoes
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.campeonatos c
    JOIN public.escolinhas e ON e.id = c.escolinha_id
    WHERE c.id = campeonato_id
    AND e.admin_user_id = auth.uid()
  )
);

CREATE POLICY "School admins can delete convocacoes"
ON public.campeonato_convocacoes
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.campeonatos c
    JOIN public.escolinhas e ON e.id = c.escolinha_id
    WHERE c.id = campeonato_id
    AND e.admin_user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_campeonato_convocacoes_updated_at
BEFORE UPDATE ON public.campeonato_convocacoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_campeonato_convocacoes_campeonato ON public.campeonato_convocacoes(campeonato_id);
CREATE INDEX idx_campeonato_convocacoes_crianca ON public.campeonato_convocacoes(crianca_id);
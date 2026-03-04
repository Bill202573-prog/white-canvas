-- Create campeonatos table
CREATE TABLE public.campeonatos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escolinha_id UUID NOT NULL REFERENCES public.escolinhas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ano INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  categoria TEXT,
  status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'finalizado')),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campeonatos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins de escolinha podem gerenciar campeonatos"
ON public.campeonatos FOR ALL
USING (is_admin_of_escolinha(escolinha_id))
WITH CHECK (is_admin_of_escolinha(escolinha_id));

CREATE POLICY "Admins podem gerenciar todos os campeonatos"
ON public.campeonatos FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Professores podem ver campeonatos da escolinha"
ON public.campeonatos FOR SELECT
USING (is_teacher_of_escolinha(escolinha_id));

-- Add campeonato_id to eventos_esportivos
ALTER TABLE public.eventos_esportivos
ADD COLUMN campeonato_id UUID REFERENCES public.campeonatos(id) ON DELETE SET NULL;

-- Add fase column to eventos_esportivos for championship games
ALTER TABLE public.eventos_esportivos
ADD COLUMN fase TEXT;

-- Create trigger for updated_at
CREATE TRIGGER update_campeonatos_updated_at
BEFORE UPDATE ON public.campeonatos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_eventos_campeonato_id ON public.eventos_esportivos(campeonato_id);
CREATE INDEX idx_campeonatos_escolinha_id ON public.campeonatos(escolinha_id);
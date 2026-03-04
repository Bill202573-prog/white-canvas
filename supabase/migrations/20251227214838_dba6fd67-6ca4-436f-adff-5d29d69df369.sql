-- Create enum for event type
CREATE TYPE evento_tipo AS ENUM ('amistoso', 'campeonato');

-- Create enum for event status
CREATE TYPE evento_status AS ENUM ('agendado', 'realizado', 'finalizado');

-- Create the eventos_esportivos table
CREATE TABLE public.eventos_esportivos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escolinha_id UUID NOT NULL REFERENCES public.escolinhas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo evento_tipo NOT NULL,
  data DATE NOT NULL,
  horario_inicio TIME WITHOUT TIME ZONE,
  horario_fim TIME WITHOUT TIME ZONE,
  local TEXT,
  categoria TEXT, -- Ex: Sub-7, Sub-8, Sub-9
  status evento_status NOT NULL DEFAULT 'agendado',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.eventos_esportivos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins podem gerenciar todos os eventos"
ON public.eventos_esportivos
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins de escolinha podem gerenciar eventos da sua escolinha"
ON public.eventos_esportivos
FOR ALL
USING (is_admin_of_escolinha(escolinha_id))
WITH CHECK (is_admin_of_escolinha(escolinha_id));

CREATE POLICY "Professores podem ver eventos da sua escolinha"
ON public.eventos_esportivos
FOR SELECT
USING (is_teacher_of_escolinha(escolinha_id));

-- Create trigger for updated_at
CREATE TRIGGER update_eventos_esportivos_updated_at
BEFORE UPDATE ON public.eventos_esportivos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for common queries
CREATE INDEX idx_eventos_esportivos_escolinha ON public.eventos_esportivos(escolinha_id);
CREATE INDEX idx_eventos_esportivos_data ON public.eventos_esportivos(data);
CREATE INDEX idx_eventos_esportivos_status ON public.eventos_esportivos(status);
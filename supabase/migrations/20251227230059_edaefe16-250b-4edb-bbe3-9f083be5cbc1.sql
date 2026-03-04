-- Create table for goal records per student
CREATE TABLE public.evento_gols (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID NOT NULL REFERENCES public.eventos_esportivos(id) ON DELETE CASCADE,
  time_id UUID NOT NULL REFERENCES public.evento_times(id) ON DELETE CASCADE,
  crianca_id UUID NOT NULL REFERENCES public.criancas(id) ON DELETE CASCADE,
  quantidade INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(evento_id, crianca_id)
);

-- Enable RLS
ALTER TABLE public.evento_gols ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins de escolinha podem gerenciar gols"
ON public.evento_gols
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM eventos_esportivos e
    JOIN escolinhas esc ON esc.id = e.escolinha_id
    WHERE e.id = evento_gols.evento_id
    AND esc.admin_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM eventos_esportivos e
    JOIN escolinhas esc ON esc.id = e.escolinha_id
    WHERE e.id = evento_gols.evento_id
    AND esc.admin_user_id = auth.uid()
  )
);

CREATE POLICY "Admins podem gerenciar todos os gols"
ON public.evento_gols
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Trigger for updated_at
CREATE TRIGGER update_evento_gols_updated_at
BEFORE UPDATE ON public.evento_gols
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
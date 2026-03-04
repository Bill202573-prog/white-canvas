
-- Add column to track which specific professional closed the attendance
ALTER TABLE public.presencas 
ADD COLUMN IF NOT EXISTS chamada_fechada_por_id UUID REFERENCES public.professores(id);

-- Add index for querying
CREATE INDEX IF NOT EXISTS idx_presencas_chamada_fechada_por_id ON public.presencas(chamada_fechada_por_id);

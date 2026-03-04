-- Add fields to track presence and absence in amistoso_convocacoes
ALTER TABLE public.amistoso_convocacoes
ADD COLUMN IF NOT EXISTS presente boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS motivo_ausencia text DEFAULT null;

-- Create enum type for absence reasons
COMMENT ON COLUMN public.amistoso_convocacoes.motivo_ausencia IS 'sem_aviso, justificado';
COMMENT ON COLUMN public.amistoso_convocacoes.presente IS 'True if athlete was present at the match, false if absent';

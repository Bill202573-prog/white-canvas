-- Add column to track who closed the attendance (chamada)
ALTER TABLE public.presencas 
ADD COLUMN IF NOT EXISTS chamada_fechada_por TEXT CHECK (chamada_fechada_por IN ('professor', 'escola'));

-- Add column to track attendance update after guardian said "não irei" but showed up
-- This will be derived from: confirmado_responsavel = false AND presente = true
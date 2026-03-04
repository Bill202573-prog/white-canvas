-- Add column for external opponent team name
ALTER TABLE public.eventos_esportivos
ADD COLUMN adversario TEXT;
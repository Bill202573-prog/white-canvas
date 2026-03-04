-- Add campo column to turmas table (for field/location like "Campo 1", "Campo Society", etc.)
ALTER TABLE public.turmas ADD COLUMN IF NOT EXISTS campo text;
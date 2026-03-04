-- Add categoria column to crianca_escolinha to track what sport/modality the child practices
ALTER TABLE public.crianca_escolinha 
ADD COLUMN categoria text DEFAULT 'Futebol de Campo';

COMMENT ON COLUMN public.crianca_escolinha.categoria IS 'Modalidade esportiva: Futebol de Campo, Futsal, Society';
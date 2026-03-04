
-- Add deactivation reason and notes columns to crianca_escolinha
ALTER TABLE public.crianca_escolinha 
ADD COLUMN motivo_inativacao text,
ADD COLUMN observacoes_inativacao text,
ADD COLUMN inativado_em timestamp with time zone;

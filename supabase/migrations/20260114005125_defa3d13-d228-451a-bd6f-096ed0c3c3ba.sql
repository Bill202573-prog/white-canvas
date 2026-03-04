-- Create enum for school financial status (independent from SaaS status)
CREATE TYPE public.escola_status_financeiro AS ENUM (
  'NAO_CONFIGURADO',
  'EM_ANALISE',
  'APROVADO',
  'REPROVADO'
);

-- Add the new column to escolinhas table with default value
ALTER TABLE public.escolinhas
ADD COLUMN status_financeiro_escola public.escola_status_financeiro NOT NULL DEFAULT 'NAO_CONFIGURADO';
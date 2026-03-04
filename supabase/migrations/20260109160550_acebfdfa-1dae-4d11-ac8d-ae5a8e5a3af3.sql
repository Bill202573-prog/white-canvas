-- Add CPF column to responsaveis table
ALTER TABLE public.responsaveis 
ADD COLUMN cpf TEXT NULL;

-- Add index for faster CPF lookups
CREATE INDEX idx_responsaveis_cpf ON public.responsaveis(cpf) WHERE cpf IS NOT NULL;
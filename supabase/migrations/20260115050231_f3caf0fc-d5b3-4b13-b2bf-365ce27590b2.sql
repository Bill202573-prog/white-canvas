-- Add nome_time column to campeonatos table
ALTER TABLE public.campeonatos
ADD COLUMN nome_time TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.campeonatos.nome_time IS 'Nome reduzido do time da escolinha para uso no campeonato (ex: Fluminense ao invés de Escola de Futebol Fluminense)';
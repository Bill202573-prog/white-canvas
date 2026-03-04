-- Adicionar campo tipo_profissional na tabela professores
-- Permite distinguir entre 'professor' e 'assistente'
ALTER TABLE public.professores
ADD COLUMN IF NOT EXISTS tipo_profissional TEXT DEFAULT 'professor';

-- Adicionar campo assistente_id na tabela turmas
-- Permite associar um assistente técnico à turma
ALTER TABLE public.turmas
ADD COLUMN IF NOT EXISTS assistente_id UUID REFERENCES public.professores(id);

-- Comentários descritivos
COMMENT ON COLUMN public.professores.tipo_profissional IS 'Tipo do profissional: professor ou assistente';
COMMENT ON COLUMN public.turmas.assistente_id IS 'ID do assistente técnico da turma';
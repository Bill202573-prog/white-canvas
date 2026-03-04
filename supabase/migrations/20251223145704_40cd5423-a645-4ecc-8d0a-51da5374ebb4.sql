-- Create turma_status enum
CREATE TYPE public.turma_status AS ENUM ('ativa', 'inativa', 'encerrada');

-- Add status column to turmas
ALTER TABLE public.turmas 
ADD COLUMN status public.turma_status NOT NULL DEFAULT 'ativa';

-- Add "Turma encerrada" to motivos_cancelamento for each school
INSERT INTO public.motivos_cancelamento (escolinha_id, nome)
SELECT id, 'Turma encerrada' FROM public.escolinhas
WHERE id NOT IN (
  SELECT escolinha_id FROM public.motivos_cancelamento WHERE nome = 'Turma encerrada'
);
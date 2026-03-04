-- Create enum for class status
CREATE TYPE public.aula_status AS ENUM ('normal', 'cancelada', 'extra');

-- Create table for cancellation reasons
CREATE TABLE public.motivos_cancelamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escolinha_id UUID NOT NULL REFERENCES public.escolinhas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for extra class reasons
CREATE TABLE public.motivos_aula_extra (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escolinha_id UUID NOT NULL REFERENCES public.escolinhas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add status and reason columns to aulas table
ALTER TABLE public.aulas 
ADD COLUMN status public.aula_status NOT NULL DEFAULT 'normal',
ADD COLUMN motivo_cancelamento_id UUID REFERENCES public.motivos_cancelamento(id),
ADD COLUMN motivo_aula_extra_id UUID REFERENCES public.motivos_aula_extra(id),
ADD COLUMN cancelado_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN cancelado_por UUID;

-- Enable RLS on new tables
ALTER TABLE public.motivos_cancelamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motivos_aula_extra ENABLE ROW LEVEL SECURITY;

-- RLS policies for motivos_cancelamento
CREATE POLICY "Admins de escolinha podem gerenciar motivos cancelamento"
ON public.motivos_cancelamento
FOR ALL
USING (is_admin_of_escolinha(escolinha_id))
WITH CHECK (is_admin_of_escolinha(escolinha_id));

CREATE POLICY "Admins podem gerenciar todos os motivos cancelamento"
ON public.motivos_cancelamento
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Professores podem ver motivos cancelamento da escolinha"
ON public.motivos_cancelamento
FOR SELECT
USING (is_teacher_of_escolinha(escolinha_id));

-- RLS policies for motivos_aula_extra
CREATE POLICY "Admins de escolinha podem gerenciar motivos aula extra"
ON public.motivos_aula_extra
FOR ALL
USING (is_admin_of_escolinha(escolinha_id))
WITH CHECK (is_admin_of_escolinha(escolinha_id));

CREATE POLICY "Admins podem gerenciar todos os motivos aula extra"
ON public.motivos_aula_extra
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Professores podem ver motivos aula extra da escolinha"
ON public.motivos_aula_extra
FOR SELECT
USING (is_teacher_of_escolinha(escolinha_id));

-- Insert default cancellation reasons for existing schools
INSERT INTO public.motivos_cancelamento (escolinha_id, nome)
SELECT e.id, motivo.nome
FROM public.escolinhas e
CROSS JOIN (
  VALUES ('Chuva'), ('Condições do campo'), ('Falta do professor'), 
         ('Manutenção do espaço'), ('Falta de luz'), ('Outros')
) AS motivo(nome)
WHERE e.ativo = true;

-- Insert default extra class reasons for existing schools
INSERT INTO public.motivos_aula_extra (escolinha_id, nome)
SELECT e.id, motivo.nome
FROM public.escolinhas e
CROSS JOIN (
  VALUES ('Compensação de aula cancelada'), ('Treino especial'), 
         ('Preparação para campeonato'), ('Outros')
) AS motivo(nome)
WHERE e.ativo = true;
-- Create table for amistoso convocations
CREATE TABLE public.amistoso_convocacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID NOT NULL REFERENCES public.eventos_esportivos(id) ON DELETE CASCADE,
  crianca_id UUID NOT NULL REFERENCES public.criancas(id) ON DELETE CASCADE,
  valor NUMERIC NULL,
  isento BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'convocado',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (evento_id, crianca_id)
);

-- Enable RLS
ALTER TABLE public.amistoso_convocacoes ENABLE ROW LEVEL SECURITY;

-- Policies for school admins
CREATE POLICY "School admins can manage amistoso convocations"
ON public.amistoso_convocacoes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.eventos_esportivos ee
    WHERE ee.id = amistoso_convocacoes.evento_id
    AND public.is_admin_of_escolinha(ee.escolinha_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.eventos_esportivos ee
    WHERE ee.id = amistoso_convocacoes.evento_id
    AND public.is_admin_of_escolinha(ee.escolinha_id)
  )
);

-- Policy for teachers to view
CREATE POLICY "Teachers can view amistoso convocations"
ON public.amistoso_convocacoes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.eventos_esportivos ee
    WHERE ee.id = amistoso_convocacoes.evento_id
    AND public.is_teacher_of_escolinha(ee.escolinha_id)
  )
);

-- Policy for guardians to view their children's convocations
CREATE POLICY "Guardians can view their children amistoso convocations"
ON public.amistoso_convocacoes
FOR SELECT
USING (
  public.guardian_owns_crianca(crianca_id)
);

-- Trigger for updated_at
CREATE TRIGGER update_amistoso_convocacoes_updated_at
BEFORE UPDATE ON public.amistoso_convocacoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
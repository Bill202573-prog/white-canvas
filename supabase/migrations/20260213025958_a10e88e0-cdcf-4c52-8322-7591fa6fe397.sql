
-- Table to persist diagnostic results
CREATE TABLE public.diagnostico_resultados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL UNIQUE,
  resultado JSONB NOT NULL,
  duracao_ms INTEGER,
  executado_por UUID REFERENCES auth.users(id),
  executado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.diagnostico_resultados ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write
CREATE POLICY "Admins can view diagnostico results"
ON public.diagnostico_resultados
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can insert diagnostico results"
ON public.diagnostico_resultados
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update diagnostico results"
ON public.diagnostico_resultados
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

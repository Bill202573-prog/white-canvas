-- Create table for event presence confirmation (similar to presencas for classes)
CREATE TABLE public.evento_presencas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID NOT NULL REFERENCES public.eventos_esportivos(id) ON DELETE CASCADE,
  crianca_id UUID NOT NULL REFERENCES public.criancas(id) ON DELETE CASCADE,
  time_id UUID NOT NULL REFERENCES public.evento_times(id) ON DELETE CASCADE,
  confirmado_responsavel BOOLEAN DEFAULT NULL,
  responsavel_confirmou_em TIMESTAMPTZ DEFAULT NULL,
  confirmado_escola BOOLEAN DEFAULT NULL,
  escola_confirmou_em TIMESTAMPTZ DEFAULT NULL,
  presente BOOLEAN DEFAULT NULL,
  observacoes TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(evento_id, crianca_id)
);

-- Enable RLS
ALTER TABLE public.evento_presencas ENABLE ROW LEVEL SECURITY;

-- Guardians can view presences of their children
CREATE POLICY "Guardians can view evento_presencas of their children"
ON public.evento_presencas
FOR SELECT
USING (guardian_owns_crianca(crianca_id));

-- Guardians can insert presences for their children
CREATE POLICY "Guardians can insert evento_presencas for their children"
ON public.evento_presencas
FOR INSERT
WITH CHECK (guardian_owns_crianca(crianca_id));

-- Guardians can update presences of their children
CREATE POLICY "Guardians can update evento_presencas of their children"
ON public.evento_presencas
FOR UPDATE
USING (guardian_owns_crianca(crianca_id));

-- School admins can manage all evento_presencas for their escolinha's events
CREATE POLICY "School admins can manage evento_presencas"
ON public.evento_presencas
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM eventos_esportivos e
    WHERE e.id = evento_presencas.evento_id
    AND is_admin_of_escolinha(e.escolinha_id)
  )
);

-- Teachers can view evento_presencas for their escolinha's events
CREATE POLICY "Teachers can view evento_presencas"
ON public.evento_presencas
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM eventos_esportivos e
    WHERE e.id = evento_presencas.evento_id
    AND is_teacher_of_escolinha(e.escolinha_id)
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_evento_presencas_updated_at
BEFORE UPDATE ON public.evento_presencas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
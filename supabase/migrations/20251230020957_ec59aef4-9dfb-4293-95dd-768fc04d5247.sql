-- Table for school communications
CREATE TABLE public.comunicados_escola (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escolinha_id UUID NOT NULL REFERENCES public.escolinhas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'informativo' CHECK (tipo IN ('informativo', 'importante', 'urgente')),
  destinatario_tipo TEXT NOT NULL CHECK (destinatario_tipo IN ('professores', 'responsaveis')),
  -- Filters for professors
  professor_id UUID REFERENCES public.professores(id) ON DELETE CASCADE, -- null = all professors
  -- Filters for guardians
  turma_id UUID REFERENCES public.turmas(id) ON DELETE CASCADE, -- null = all turmas
  categoria TEXT, -- child category filter
  horario TEXT, -- schedule filter (e.g., "manha", "tarde", "noite")
  criado_por UUID NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  data_expiracao TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for read confirmations
CREATE TABLE public.comunicado_escola_leituras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comunicado_id UUID NOT NULL REFERENCES public.comunicados_escola(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  lido_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(comunicado_id, user_id)
);

-- Enable RLS
ALTER TABLE public.comunicados_escola ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicado_escola_leituras ENABLE ROW LEVEL SECURITY;

-- RLS policies for comunicados_escola
CREATE POLICY "School admins can manage their communications"
ON public.comunicados_escola
FOR ALL
USING (is_admin_of_escolinha(escolinha_id))
WITH CHECK (is_admin_of_escolinha(escolinha_id));

CREATE POLICY "Teachers can view communications for them"
ON public.comunicados_escola
FOR SELECT
USING (
  destinatario_tipo = 'professores' 
  AND ativo = true
  AND EXISTS (
    SELECT 1 FROM professores p 
    WHERE p.user_id = auth.uid() 
    AND p.escolinha_id = comunicados_escola.escolinha_id
    AND p.ativo = true
    AND (comunicados_escola.professor_id IS NULL OR comunicados_escola.professor_id = p.id)
  )
);

CREATE POLICY "Guardians can view communications for them"
ON public.comunicados_escola
FOR SELECT
USING (
  destinatario_tipo = 'responsaveis'
  AND ativo = true
  AND guardian_can_access_escolinha(escolinha_id)
  AND (
    turma_id IS NULL 
    OR EXISTS (
      SELECT 1 FROM crianca_turma ct
      JOIN crianca_responsavel cr ON cr.crianca_id = ct.crianca_id
      JOIN responsaveis r ON r.id = cr.responsavel_id
      WHERE r.user_id = auth.uid()
      AND ct.turma_id = comunicados_escola.turma_id
      AND ct.ativo = true
    )
  )
);

-- RLS policies for leituras
CREATE POLICY "Users can insert their own read confirmations"
ON public.comunicado_escola_leituras
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own read confirmations"
ON public.comunicado_escola_leituras
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "School admins can view all read confirmations for their communications"
ON public.comunicado_escola_leituras
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM comunicados_escola ce
    WHERE ce.id = comunicado_id
    AND is_admin_of_escolinha(ce.escolinha_id)
  )
);

-- Indexes
CREATE INDEX idx_comunicados_escola_escolinha ON public.comunicados_escola(escolinha_id);
CREATE INDEX idx_comunicados_escola_tipo ON public.comunicados_escola(destinatario_tipo);
CREATE INDEX idx_comunicado_escola_leituras_comunicado ON public.comunicado_escola_leituras(comunicado_id);
CREATE INDEX idx_comunicado_escola_leituras_user ON public.comunicado_escola_leituras(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_comunicados_escola_updated_at
BEFORE UPDATE ON public.comunicados_escola
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
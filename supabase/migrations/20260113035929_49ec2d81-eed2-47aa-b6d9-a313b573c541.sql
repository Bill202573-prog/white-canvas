-- Criar tabela de relacionamento turma-assistentes (muitos para muitos)
CREATE TABLE public.turma_assistentes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  professor_id UUID NOT NULL REFERENCES public.professores(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(turma_id, professor_id)
);

-- Habilitar RLS
ALTER TABLE public.turma_assistentes ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Admins podem gerenciar turma_assistentes"
ON public.turma_assistentes
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins de escolinha podem gerenciar turma_assistentes"
ON public.turma_assistentes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM turmas t
    JOIN escolinhas e ON e.id = t.escolinha_id
    WHERE t.id = turma_assistentes.turma_id
    AND e.admin_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM turmas t
    JOIN escolinhas e ON e.id = t.escolinha_id
    WHERE t.id = turma_assistentes.turma_id
    AND e.admin_user_id = auth.uid()
  )
);

CREATE POLICY "Professores podem ver assistentes das turmas"
ON public.turma_assistentes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM turmas t
    JOIN professores p ON p.escolinha_id = t.escolinha_id
    WHERE t.id = turma_assistentes.turma_id
    AND p.user_id = auth.uid()
    AND p.ativo = true
  )
);

-- Bloquear acesso anônimo
CREATE POLICY "Bloquear acesso anonimo turma_assistentes"
ON public.turma_assistentes
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Migrar dados existentes do campo assistente_id para a nova tabela
INSERT INTO public.turma_assistentes (turma_id, professor_id)
SELECT id, assistente_id FROM public.turmas WHERE assistente_id IS NOT NULL;

-- Comentário
COMMENT ON TABLE public.turma_assistentes IS 'Relacionamento muitos-para-muitos entre turmas e assistentes técnicos';
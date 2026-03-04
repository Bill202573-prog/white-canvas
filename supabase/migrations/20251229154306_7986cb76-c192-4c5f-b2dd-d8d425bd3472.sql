-- Criar tabela de comunicados/avisos
CREATE TABLE public.comunicados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'informativo', -- informativo, urgente, importante
  escolinha_id UUID REFERENCES public.escolinhas(id) ON DELETE CASCADE, -- NULL = todas as escolinhas
  criado_por UUID NOT NULL, -- admin user_id
  ativo BOOLEAN NOT NULL DEFAULT true,
  data_expiracao TIMESTAMP WITH TIME ZONE, -- opcional, para comunicados temporários
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.comunicados ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Admins podem fazer tudo
CREATE POLICY "Admins podem gerenciar comunicados"
ON public.comunicados
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Escolas podem ver comunicados direcionados a elas ou para todas
CREATE POLICY "Escolinhas podem ver seus comunicados"
ON public.comunicados
FOR SELECT
TO authenticated
USING (
  ativo = true 
  AND (data_expiracao IS NULL OR data_expiracao > now())
  AND (
    escolinha_id IS NULL 
    OR public.is_admin_of_escolinha(escolinha_id)
  )
);

-- Responsáveis podem ver comunicados das escolinhas de seus filhos
CREATE POLICY "Responsaveis podem ver comunicados"
ON public.comunicados
FOR SELECT
TO authenticated
USING (
  ativo = true 
  AND (data_expiracao IS NULL OR data_expiracao > now())
  AND (
    escolinha_id IS NULL 
    OR public.guardian_can_access_escolinha(escolinha_id)
  )
);

-- Trigger para updated_at
CREATE TRIGGER update_comunicados_updated_at
  BEFORE UPDATE ON public.comunicados
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_comunicados_escolinha ON public.comunicados(escolinha_id);
CREATE INDEX idx_comunicados_ativo ON public.comunicados(ativo);
CREATE INDEX idx_comunicados_created_at ON public.comunicados(created_at DESC);
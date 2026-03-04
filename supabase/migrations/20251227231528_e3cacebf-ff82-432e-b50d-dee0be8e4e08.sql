-- Table for individual awards (premiações individuais)
CREATE TABLE public.evento_premiacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID NOT NULL REFERENCES public.eventos_esportivos(id) ON DELETE CASCADE,
  crianca_id UUID NOT NULL REFERENCES public.criancas(id) ON DELETE CASCADE,
  tipo_premiacao TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(evento_id, tipo_premiacao)
);

-- Table for collective achievements (conquistas coletivas / sala de troféus)
CREATE TABLE public.conquistas_coletivas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID NOT NULL REFERENCES public.eventos_esportivos(id) ON DELETE CASCADE,
  escolinha_id UUID NOT NULL REFERENCES public.escolinhas(id) ON DELETE CASCADE,
  colocacao TEXT NOT NULL CHECK (colocacao IN ('campeao', 'vice', 'terceiro')),
  nome_campeonato TEXT NOT NULL,
  categoria TEXT,
  ano INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(evento_id, escolinha_id)
);

-- Enable RLS
ALTER TABLE public.evento_premiacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conquistas_coletivas ENABLE ROW LEVEL SECURITY;

-- RLS policies for evento_premiacoes
CREATE POLICY "Admins podem gerenciar todas as premiacoes"
ON public.evento_premiacoes
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins de escolinha podem gerenciar premiacoes"
ON public.evento_premiacoes
FOR ALL
USING (EXISTS (
  SELECT 1 FROM eventos_esportivos e
  JOIN escolinhas esc ON esc.id = e.escolinha_id
  WHERE e.id = evento_premiacoes.evento_id AND esc.admin_user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM eventos_esportivos e
  JOIN escolinhas esc ON esc.id = e.escolinha_id
  WHERE e.id = evento_premiacoes.evento_id AND esc.admin_user_id = auth.uid()
));

-- RLS policies for conquistas_coletivas
CREATE POLICY "Admins podem gerenciar todas as conquistas"
ON public.conquistas_coletivas
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins de escolinha podem gerenciar conquistas"
ON public.conquistas_coletivas
FOR ALL
USING (is_admin_of_escolinha(escolinha_id))
WITH CHECK (is_admin_of_escolinha(escolinha_id));

CREATE POLICY "Todos podem ver conquistas"
ON public.conquistas_coletivas
FOR SELECT
USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_evento_premiacoes_updated_at
BEFORE UPDATE ON public.evento_premiacoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conquistas_coletivas_updated_at
BEFORE UPDATE ON public.conquistas_coletivas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Create table for student monthly fees (mensalidades)
CREATE TABLE public.mensalidades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crianca_id UUID NOT NULL REFERENCES public.criancas(id) ON DELETE CASCADE,
  escolinha_id UUID NOT NULL REFERENCES public.escolinhas(id) ON DELETE CASCADE,
  mes_referencia DATE NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 180.00,
  valor_pago NUMERIC,
  data_vencimento DATE NOT NULL,
  data_pagamento TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado')),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(crianca_id, escolinha_id, mes_referencia)
);

-- Enable RLS
ALTER TABLE public.mensalidades ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mensalidades
CREATE POLICY "Admins podem gerenciar todas as mensalidades"
ON public.mensalidades FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins de escolinha podem gerenciar mensalidades da sua escolinha"
ON public.mensalidades FOR ALL
USING (is_admin_of_escolinha(escolinha_id))
WITH CHECK (is_admin_of_escolinha(escolinha_id));

CREATE POLICY "Responsaveis podem ver mensalidades dos filhos"
ON public.mensalidades FOR SELECT
USING (crianca_id IN (
  SELECT cr.crianca_id FROM crianca_responsavel cr 
  WHERE cr.responsavel_id = get_responsavel_id(auth.uid())
));

-- Create trigger for updated_at
CREATE TRIGGER update_mensalidades_updated_at
BEFORE UPDATE ON public.mensalidades
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for performance
CREATE INDEX idx_mensalidades_escolinha_id ON public.mensalidades(escolinha_id);
CREATE INDEX idx_mensalidades_crianca_id ON public.mensalidades(crianca_id);
CREATE INDEX idx_mensalidades_mes_referencia ON public.mensalidades(mes_referencia);
CREATE INDEX idx_mensalidades_status ON public.mensalidades(status);
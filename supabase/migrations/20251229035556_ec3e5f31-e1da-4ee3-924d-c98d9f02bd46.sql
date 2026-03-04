-- Adicionar campos para integração AbacatePay na tabela historico_cobrancas
ALTER TABLE public.historico_cobrancas 
ADD COLUMN IF NOT EXISTS abacatepay_billing_id TEXT,
ADD COLUMN IF NOT EXISTS abacatepay_url TEXT,
ADD COLUMN IF NOT EXISTS data_vencimento DATE,
ADD COLUMN IF NOT EXISTS metodo_pagamento TEXT DEFAULT 'pix',
ADD COLUMN IF NOT EXISTS data_pagamento TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS comprovante_url TEXT;

-- Criar índice para busca por billing_id
CREATE INDEX IF NOT EXISTS idx_historico_cobrancas_abacatepay_billing_id 
ON public.historico_cobrancas(abacatepay_billing_id);

-- Criar tabela para configurações de cobrança do SaaS
CREATE TABLE IF NOT EXISTS public.saas_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chave TEXT NOT NULL UNIQUE,
  valor TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir configurações padrão
INSERT INTO public.saas_config (chave, valor, descricao) VALUES
  ('dias_vencimento', '10', 'Dia do mês para vencimento das cobranças'),
  ('dias_carencia_suspensao', '15', 'Dias de atraso antes de suspender a escolinha'),
  ('notificar_atraso_dias', '5,10,15', 'Dias de atraso para enviar notificações (separados por vírgula)')
ON CONFLICT (chave) DO NOTHING;

-- Enable RLS
ALTER TABLE public.saas_config ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver/editar configurações
CREATE POLICY "Admins can view saas_config" ON public.saas_config
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update saas_config" ON public.saas_config
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Criar tabela para notificações de inadimplência
CREATE TABLE IF NOT EXISTS public.notificacoes_inadimplencia (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escolinha_id UUID NOT NULL REFERENCES public.escolinhas(id) ON DELETE CASCADE,
  cobranca_id UUID REFERENCES public.historico_cobrancas(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL, -- 'lembrete', 'aviso_atraso', 'aviso_suspensao', 'suspensao'
  mensagem TEXT NOT NULL,
  lido BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notificacoes_inadimplencia ENABLE ROW LEVEL SECURITY;

-- Admins podem ver todas as notificações
CREATE POLICY "Admins can view all notificacoes" ON public.notificacoes_inadimplencia
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage notificacoes" ON public.notificacoes_inadimplencia
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Escolas podem ver suas próprias notificações
CREATE POLICY "Schools can view own notificacoes" ON public.notificacoes_inadimplencia
  FOR SELECT USING (public.is_admin_of_escolinha(escolinha_id));

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_notificacoes_inadimplencia_escolinha 
ON public.notificacoes_inadimplencia(escolinha_id);

CREATE INDEX IF NOT EXISTS idx_notificacoes_inadimplencia_created 
ON public.notificacoes_inadimplencia(created_at DESC);

-- Trigger para updated_at em saas_config
CREATE TRIGGER update_saas_config_updated_at
  BEFORE UPDATE ON public.saas_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
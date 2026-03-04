
-- Tabela de subscriptions de push (dispositivos registrados)
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own subscriptions"
  ON public.push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Configurações de push por escola
CREATE TABLE public.escola_push_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escolinha_id UUID NOT NULL REFERENCES public.escolinhas(id) ON DELETE CASCADE,
  push_ativo BOOLEAN NOT NULL DEFAULT false,
  -- Cobrança
  cobranca_3_dias_antes BOOLEAN NOT NULL DEFAULT true,
  cobranca_1_dia_antes BOOLEAN NOT NULL DEFAULT true,
  cobranca_no_dia BOOLEAN NOT NULL DEFAULT true,
  cobranca_1_dia_depois BOOLEAN NOT NULL DEFAULT false,
  -- Convocação / Presença
  convocacao_2_dias_antes BOOLEAN NOT NULL DEFAULT true,
  convocacao_1_dia_antes BOOLEAN NOT NULL DEFAULT true,
  convocacao_no_dia BOOLEAN NOT NULL DEFAULT false,
  -- Comunicados
  comunicado_push BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(escolinha_id)
);

ALTER TABLE public.escola_push_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School admins can manage their push config"
  ON public.escola_push_config FOR ALL
  USING (is_admin_of_escolinha(escolinha_id))
  WITH CHECK (is_admin_of_escolinha(escolinha_id));

-- Log de notificações enviadas (evita duplicatas + auditoria)
CREATE TABLE public.push_notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  escolinha_id UUID REFERENCES public.escolinhas(id),
  tipo TEXT NOT NULL, -- 'cobranca', 'convocacao', 'comunicado'
  referencia_id UUID, -- id da mensalidade, convocação ou comunicado
  dias_antes INTEGER, -- quantos dias antes do vencimento/evento
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  enviado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  entregue BOOLEAN DEFAULT false
);

ALTER TABLE public.push_notifications_log ENABLE ROW LEVEL SECURITY;

-- Admins da escola podem ver os logs
CREATE POLICY "School admins can view push logs"
  ON public.push_notifications_log FOR SELECT
  USING (is_admin_of_escolinha(escolinha_id));

-- Service role inserts (edge functions)
CREATE POLICY "Service can insert push logs"
  ON public.push_notifications_log FOR INSERT
  WITH CHECK (true);

-- Index para evitar duplicatas de envio
CREATE INDEX idx_push_log_dedup 
  ON public.push_notifications_log(user_id, tipo, referencia_id, dias_antes);

-- Index para busca rápida de subscriptions
CREATE INDEX idx_push_subscriptions_user 
  ON public.push_subscriptions(user_id);

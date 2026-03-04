-- 1. Adicionar campos na tabela escola_cadastro_bancario
ALTER TABLE public.escola_cadastro_bancario
ADD COLUMN IF NOT EXISTS asaas_api_key text,
ADD COLUMN IF NOT EXISTS asaas_wallet_id text;

-- 2. Criar nova tabela para notificações administrativas do Asaas
CREATE TABLE IF NOT EXISTS public.escola_asaas_admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escolinha_id uuid NOT NULL REFERENCES public.escolinhas(id) ON DELETE CASCADE,
  evento text NOT NULL,
  mensagem text,
  dados jsonb,
  lida boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Criar índices para otimização
CREATE INDEX IF NOT EXISTS idx_notifications_lida 
ON public.escola_asaas_admin_notifications(lida);

CREATE INDEX IF NOT EXISTS idx_notifications_created 
ON public.escola_asaas_admin_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cadastro_account_id 
ON public.escola_cadastro_bancario(asaas_account_id);

-- 4. Habilitar RLS na nova tabela
ALTER TABLE public.escola_asaas_admin_notifications ENABLE ROW LEVEL SECURITY;

-- 5. Policy para admin da escola ver suas próprias notificações
CREATE POLICY "Admin pode ver notificações da sua escola"
ON public.escola_asaas_admin_notifications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.escolinhas e
    WHERE e.id = escolinha_id
    AND e.admin_user_id = auth.uid()
  )
);

-- 6. Policy para admin marcar notificações como lidas
CREATE POLICY "Admin pode atualizar notificações da sua escola"
ON public.escola_asaas_admin_notifications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.escolinhas e
    WHERE e.id = escolinha_id
    AND e.admin_user_id = auth.uid()
  )
);

-- 7. Policy para inserção via service role (edge functions)
CREATE POLICY "Service pode inserir notificações"
ON public.escola_asaas_admin_notifications
FOR INSERT
WITH CHECK (true);
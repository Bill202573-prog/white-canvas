-- Remover policy permissiva e criar uma mais restritiva
DROP POLICY IF EXISTS "Service pode inserir notificações" ON public.escola_asaas_admin_notifications;

-- Criar policy que permite inserção apenas para admins da escola ou via service role
-- Como edge functions usam service_role, elas bypassam RLS automaticamente
-- Então não precisamos de policy de INSERT para usuários normais
CREATE POLICY "Admin pode inserir notificações da sua escola"
ON public.escola_asaas_admin_notifications
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.escolinhas e
    WHERE e.id = escolinha_id
    AND e.admin_user_id = auth.uid()
  )
);
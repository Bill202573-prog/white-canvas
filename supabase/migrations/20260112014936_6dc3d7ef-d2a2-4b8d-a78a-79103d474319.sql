-- Garantir que as VIEWs usam SECURITY INVOKER (padrão do Postgres)
-- Isso faz com que as VIEWs respeitem as políticas RLS da tabela base
-- baseadas no usuário que está fazendo a consulta

ALTER VIEW public.escolinhas_publico SET (security_invoker = on);
ALTER VIEW public.professores_publico SET (security_invoker = on);
-- =====================================================
-- WHITELIST DE ACESSO - ATIVIDADES EXTERNAS
-- Liberação individual para usuário de teste
-- =====================================================

-- Tabela de whitelist para funcionalidades beta/teste
CREATE TABLE public.atividades_externas_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL UNIQUE,
  user_id UUID, -- preenchido após primeiro acesso
  motivo TEXT NOT NULL DEFAULT 'teste_beta',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE -- null = sem expiração
);

-- Índice para busca rápida por email
CREATE INDEX idx_whitelist_email ON public.atividades_externas_whitelist(user_email);

-- RLS - apenas admins podem gerenciar whitelist
ALTER TABLE public.atividades_externas_whitelist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas admins podem gerenciar whitelist"
  ON public.atividades_externas_whitelist
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Inserir usuário de teste
INSERT INTO public.atividades_externas_whitelist (user_email, motivo)
VALUES ('wnogueira@hotmail.com', 'usuario_piloto_teste');

-- =====================================================
-- FUNÇÃO: Verificar acesso às atividades externas
-- =====================================================
CREATE OR REPLACE FUNCTION public.has_atividades_externas_access(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.atividades_externas_whitelist w
    JOIN auth.users u ON u.email = w.user_email
    WHERE u.id = check_user_id
      AND w.ativo = true
      AND (w.expires_at IS NULL OR w.expires_at > now())
  )
$$;

-- =====================================================
-- ATUALIZAR RLS: Liberar apenas para whitelist
-- =====================================================

-- Remover política de bloqueio total
DROP POLICY IF EXISTS "Funcionalidade inerte - acesso bloqueado" ON public.atividades_externas;

-- Política: usuários em whitelist podem ver atividades dos seus filhos
CREATE POLICY "Whitelist pode ver atividades dos filhos"
  ON public.atividades_externas
  FOR SELECT
  USING (
    public.has_atividades_externas_access(auth.uid()) 
    AND crianca_id IN (SELECT public.get_criancas_do_responsavel(auth.uid()))
  );

-- Política: usuários em whitelist podem criar atividades para seus filhos
CREATE POLICY "Whitelist pode criar atividades"
  ON public.atividades_externas
  FOR INSERT
  WITH CHECK (
    public.has_atividades_externas_access(auth.uid()) 
    AND crianca_id IN (SELECT public.get_criancas_do_responsavel(auth.uid()))
    AND criado_por = auth.uid()
    AND visibilidade = 'privado'
  );

-- Política: usuários em whitelist podem editar suas próprias atividades
CREATE POLICY "Whitelist pode editar suas atividades"
  ON public.atividades_externas
  FOR UPDATE
  USING (
    public.has_atividades_externas_access(auth.uid()) 
    AND criado_por = auth.uid()
  )
  WITH CHECK (
    visibilidade = 'privado'
  );

-- Política: usuários em whitelist podem deletar suas próprias atividades  
CREATE POLICY "Whitelist pode deletar suas atividades"
  ON public.atividades_externas
  FOR DELETE
  USING (
    public.has_atividades_externas_access(auth.uid()) 
    AND criado_por = auth.uid()
  );

-- Comentário de documentação
COMMENT ON TABLE public.atividades_externas_whitelist IS 'Controle de acesso individual para funcionalidade beta de atividades externas. NÃO é feature flag global.';
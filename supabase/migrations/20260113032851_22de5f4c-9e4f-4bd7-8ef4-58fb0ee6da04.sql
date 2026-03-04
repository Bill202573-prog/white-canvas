-- =====================================================
-- CORREÇÃO FINAL DE SEGURANÇA - DADOS FINANCEIROS
-- Bloquear acesso público (anon) em tabelas sensíveis
-- =====================================================

-- 1) MENSALIDADES - Bloquear acesso anônimo
-- Criar política que nega explicitamente acesso anon
CREATE POLICY "Bloquear acesso anonimo mensalidades"
ON public.mensalidades
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 2) ESCOLINHAS - Bloquear acesso anônimo à tabela principal
-- (dados sensíveis: email, telefone, CNPJ, senhas)
CREATE POLICY "Bloquear acesso anonimo escolinhas"
ON public.escolinhas
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 3) HISTORICO_COBRANCAS - Bloquear acesso anônimo
CREATE POLICY "Bloquear acesso anonimo historico_cobrancas"
ON public.historico_cobrancas
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 4) RESPONSAVEIS - Bloquear acesso anônimo
CREATE POLICY "Bloquear acesso anonimo responsaveis"
ON public.responsaveis
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 5) ESCOLINHA_FINANCEIRO - Bloquear acesso anônimo
CREATE POLICY "Bloquear acesso anonimo escolinha_financeiro"
ON public.escolinha_financeiro
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 6) CRIANCAS - Bloquear acesso anônimo (dados pessoais)
CREATE POLICY "Bloquear acesso anonimo criancas"
ON public.criancas
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 7) CRIANCA_RESPONSAVEL - Bloquear acesso anônimo
CREATE POLICY "Bloquear acesso anonimo crianca_responsavel"
ON public.crianca_responsavel
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 8) PROFESSORES - Bloquear acesso anônimo (dados sensíveis)
CREATE POLICY "Bloquear acesso anonimo professores"
ON public.professores
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 9) PRESENCAS - Bloquear acesso anônimo
CREATE POLICY "Bloquear acesso anonimo presencas"
ON public.presencas
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 10) USER_ROLES - Bloquear acesso anônimo
CREATE POLICY "Bloquear acesso anonimo user_roles"
ON public.user_roles
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 11) COMUNICADOS_ESCOLA - Bloquear acesso anônimo
CREATE POLICY "Bloquear acesso anonimo comunicados_escola"
ON public.comunicados_escola
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 12) COMUNICADOS - Bloquear acesso anônimo
CREATE POLICY "Bloquear acesso anonimo comunicados"
ON public.comunicados
FOR ALL
TO anon
USING (false)
WITH CHECK (false);
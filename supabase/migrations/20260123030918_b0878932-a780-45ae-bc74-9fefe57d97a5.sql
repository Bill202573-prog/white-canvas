-- Remover a política que bloqueia completamente usuários anônimos
DROP POLICY IF EXISTS "Bloquear acesso anonimo indicacoes" ON public.indicacoes;

-- Criar política para permitir inserção pública (anônima) de indicações
-- Isso é necessário para o fluxo de indicação funcionar sem login
CREATE POLICY "Permitir insercao publica de indicacoes"
ON public.indicacoes
FOR INSERT
TO anon
WITH CHECK (true);

-- Manter a tabela protegida para leitura/update/delete por anônimos
-- (apenas INSERT é permitido)
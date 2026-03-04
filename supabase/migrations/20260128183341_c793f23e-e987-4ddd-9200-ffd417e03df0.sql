
-- Remover policy duplicada
DROP POLICY IF EXISTS "Global admin can view all bank registrations" ON public.escola_cadastro_bancario;

-- A escola precisa poder LER seus próprios dados (sem campos sensíveis) via VIEW
-- Mas para INSERT/UPDATE precisa da tabela base
-- Criar policy que permite SELECT apenas dos campos não-sensíveis usando a VIEW
-- A VIEW já tem security_invoker, então precisa de RLS na tabela base

-- Adicionar policy de SELECT para escola usando a VIEW
-- A escola vai acessar via VIEW que filtra os campos sensíveis
CREATE POLICY "School admin can view own bank registration via view"
ON public.escola_cadastro_bancario
FOR SELECT
USING (
  is_admin_of_escolinha(escolinha_id)
);

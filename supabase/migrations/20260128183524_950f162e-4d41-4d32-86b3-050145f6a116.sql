
-- Limpar policies duplicadas e garantir configuração correta
-- Remover duplicação: "Global admin..." e "Only global admin..."
DROP POLICY IF EXISTS "Global admin can view all bank registrations" ON public.escola_cadastro_bancario;

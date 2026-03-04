-- Add RLS policy for guardians to view their children's enrollment charges
CREATE POLICY "Responsaveis podem ver cobrancas de entrada dos filhos" 
ON public.cobrancas_entrada 
FOR SELECT 
USING (guardian_owns_crianca(crianca_id));
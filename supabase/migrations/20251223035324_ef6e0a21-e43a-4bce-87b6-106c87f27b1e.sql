-- First, let's fix the INSERT policy for criancas to properly check school admin
DROP POLICY IF EXISTS "Admins de escolinha podem inserir criancas" ON public.criancas;

CREATE POLICY "Admins de escolinha podem inserir criancas" 
ON public.criancas 
FOR INSERT 
WITH CHECK (is_admin_of_escolinha((SELECT id FROM escolinhas WHERE admin_user_id = auth.uid() LIMIT 1)));

-- Add insert policy for responsaveis so school admins can create guardians
DROP POLICY IF EXISTS "Admins de escolinha podem inserir responsaveis" ON public.responsaveis;

CREATE POLICY "Admins de escolinha podem inserir responsaveis"
ON public.responsaveis
FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM escolinhas WHERE admin_user_id = auth.uid()));

-- Add update policy for responsaveis so school admins can update guardians
DROP POLICY IF EXISTS "Admins de escolinha podem atualizar responsaveis" ON public.responsaveis;

CREATE POLICY "Admins de escolinha podem atualizar responsaveis"
ON public.responsaveis
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM crianca_responsavel cr
  JOIN crianca_escolinha ce ON ce.crianca_id = cr.crianca_id
  JOIN escolinhas e ON e.id = ce.escolinha_id
  WHERE cr.responsavel_id = responsaveis.id AND e.admin_user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM crianca_responsavel cr
  JOIN crianca_escolinha ce ON ce.crianca_id = cr.crianca_id
  JOIN escolinhas e ON e.id = ce.escolinha_id
  WHERE cr.responsavel_id = responsaveis.id AND e.admin_user_id = auth.uid()
));
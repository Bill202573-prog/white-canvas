-- Fix the RLS policy for criancas table to allow school admins to INSERT new children
-- The current policy requires crianca_escolinha link which doesn't exist yet during INSERT

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Admins de escolinha podem gerenciar criancas da sua escolinha" ON public.criancas;

-- Create separate policies for SELECT/UPDATE/DELETE (requires existing link)
CREATE POLICY "Admins de escolinha podem ver/atualizar/deletar criancas"
ON public.criancas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM crianca_escolinha ce
    JOIN escolinhas e ON e.id = ce.escolinha_id
    WHERE ce.crianca_id = criancas.id 
    AND e.admin_user_id = auth.uid()
  )
);

CREATE POLICY "Admins de escolinha podem atualizar criancas"
ON public.criancas
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM crianca_escolinha ce
    JOIN escolinhas e ON e.id = ce.escolinha_id
    WHERE ce.crianca_id = criancas.id 
    AND e.admin_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM crianca_escolinha ce
    JOIN escolinhas e ON e.id = ce.escolinha_id
    WHERE ce.crianca_id = criancas.id 
    AND e.admin_user_id = auth.uid()
  )
);

CREATE POLICY "Admins de escolinha podem deletar criancas"
ON public.criancas
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM crianca_escolinha ce
    JOIN escolinhas e ON e.id = ce.escolinha_id
    WHERE ce.crianca_id = criancas.id 
    AND e.admin_user_id = auth.uid()
  )
);

-- Allow INSERT for school admins (they will link the child right after)
CREATE POLICY "Admins de escolinha podem inserir criancas"
ON public.criancas
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM escolinhas e
    WHERE e.admin_user_id = auth.uid()
  )
);
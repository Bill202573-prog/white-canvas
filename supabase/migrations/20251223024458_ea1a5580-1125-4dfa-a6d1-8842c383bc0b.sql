-- Fix infinite recursion in crianca_responsavel policies
-- The policy references responsaveis which may reference back

-- Create helper function to check if user is responsavel
CREATE OR REPLACE FUNCTION public.is_responsavel(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.responsaveis r
    WHERE r.user_id = _user_id
  )
$$;

-- Get responsavel id for user
CREATE OR REPLACE FUNCTION public.get_responsavel_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT r.id
  FROM public.responsaveis r
  WHERE r.user_id = _user_id
  LIMIT 1
$$;

-- Fix crianca_responsavel policies
DROP POLICY IF EXISTS "Responsaveis podem ver seus vinculos" ON public.crianca_responsavel;
CREATE POLICY "Responsaveis podem ver seus vinculos"
ON public.crianca_responsavel
FOR SELECT
TO authenticated
USING (responsavel_id = public.get_responsavel_id(auth.uid()));

-- Fix responsaveis policies
DROP POLICY IF EXISTS "Responsaveis podem ver seu proprio cadastro" ON public.responsaveis;
CREATE POLICY "Responsaveis podem ver seu proprio cadastro"
ON public.responsaveis
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Fix presencas policies that reference responsaveis
DROP POLICY IF EXISTS "Responsaveis podem ver e confirmar presenca dos filhos" ON public.presencas;
CREATE POLICY "Responsaveis podem ver e confirmar presenca dos filhos"
ON public.presencas
FOR SELECT
TO authenticated
USING (
  crianca_id IN (
    SELECT cr.crianca_id 
    FROM crianca_responsavel cr 
    WHERE cr.responsavel_id = public.get_responsavel_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Responsaveis podem atualizar confirmacao de presenca" ON public.presencas;
CREATE POLICY "Responsaveis podem atualizar confirmacao de presenca"
ON public.presencas
FOR UPDATE
TO authenticated
USING (
  crianca_id IN (
    SELECT cr.crianca_id 
    FROM crianca_responsavel cr 
    WHERE cr.responsavel_id = public.get_responsavel_id(auth.uid())
  )
)
WITH CHECK (
  crianca_id IN (
    SELECT cr.crianca_id 
    FROM crianca_responsavel cr 
    WHERE cr.responsavel_id = public.get_responsavel_id(auth.uid())
  )
);

-- Fix aulas policy that may cause recursion via crianca_responsavel
DROP POLICY IF EXISTS "Responsaveis podem ver aulas das turmas dos filhos" ON public.aulas;
CREATE POLICY "Responsaveis podem ver aulas das turmas dos filhos"
ON public.aulas
FOR SELECT
TO authenticated
USING (
  turma_id IN (
    SELECT ct.turma_id 
    FROM crianca_turma ct 
    WHERE ct.crianca_id IN (
      SELECT cr.crianca_id 
      FROM crianca_responsavel cr 
      WHERE cr.responsavel_id = public.get_responsavel_id(auth.uid())
    )
  )
);

-- Fix criancas policies that reference responsaveis
DROP POLICY IF EXISTS "Responsaveis podem ver suas criancas" ON public.criancas;
CREATE POLICY "Responsaveis podem ver suas criancas"
ON public.criancas
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT cr.crianca_id 
    FROM crianca_responsavel cr 
    WHERE cr.responsavel_id = public.get_responsavel_id(auth.uid())
  )
);
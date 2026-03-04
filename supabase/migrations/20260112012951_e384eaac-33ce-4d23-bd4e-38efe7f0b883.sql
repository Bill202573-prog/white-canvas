-- Remover as políticas problemáticas que causam recursão
DROP POLICY IF EXISTS "Responsaveis podem ver escolinhas dos filhos" ON public.escolinhas;
DROP POLICY IF EXISTS "Professores podem ver sua escolinha" ON public.escolinhas;
DROP POLICY IF EXISTS "Responsaveis podem ver vinculos dos filhos" ON public.crianca_escolinha;
DROP POLICY IF EXISTS "Professores podem ver vinculos dos alunos" ON public.crianca_escolinha;

-- Criar função SECURITY DEFINER para verificar se responsável pode acessar escolinha
CREATE OR REPLACE FUNCTION public.guardian_can_view_escolinha(_escolinha_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM crianca_escolinha ce
    JOIN crianca_responsavel cr ON cr.crianca_id = ce.crianca_id
    JOIN responsaveis r ON r.id = cr.responsavel_id
    WHERE ce.escolinha_id = _escolinha_id
      AND r.user_id = auth.uid()
      AND ce.ativo = true
  )
$$;

-- Criar função SECURITY DEFINER para verificar se professor pode acessar escolinha
CREATE OR REPLACE FUNCTION public.teacher_can_view_escolinha(_escolinha_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM professores p
    WHERE p.escolinha_id = _escolinha_id
      AND p.user_id = auth.uid()
      AND p.ativo = true
  )
$$;

-- Criar função SECURITY DEFINER para verificar se responsável pode ver crianca_escolinha
CREATE OR REPLACE FUNCTION public.guardian_can_view_crianca_escolinha(_crianca_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM crianca_responsavel cr
    JOIN responsaveis r ON r.id = cr.responsavel_id
    WHERE cr.crianca_id = _crianca_id
      AND r.user_id = auth.uid()
  )
$$;

-- Criar função SECURITY DEFINER para verificar se professor pode ver crianca_escolinha
CREATE OR REPLACE FUNCTION public.teacher_can_view_crianca_escolinha(_crianca_id uuid, _escolinha_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM professores p
    WHERE p.escolinha_id = _escolinha_id
      AND p.user_id = auth.uid()
      AND p.ativo = true
  )
$$;

-- Recriar política para escolinhas usando função
CREATE POLICY "Responsaveis podem ver escolinhas dos filhos" ON public.escolinhas
  FOR SELECT
  TO authenticated
  USING (public.guardian_can_view_escolinha(id));

CREATE POLICY "Professores podem ver sua escolinha" ON public.escolinhas
  FOR SELECT
  TO authenticated
  USING (public.teacher_can_view_escolinha(id));

-- Recriar política para crianca_escolinha usando função
CREATE POLICY "Responsaveis podem ver vinculos dos filhos" ON public.crianca_escolinha
  FOR SELECT
  TO authenticated
  USING (public.guardian_can_view_crianca_escolinha(crianca_id));

CREATE POLICY "Professores podem ver vinculos dos alunos" ON public.crianca_escolinha
  FOR SELECT
  TO authenticated
  USING (public.teacher_can_view_crianca_escolinha(crianca_id, escolinha_id));
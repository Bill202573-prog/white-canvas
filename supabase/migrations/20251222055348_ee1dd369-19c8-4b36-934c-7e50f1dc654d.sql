-- Add optional CNPJ field (keeps UUID PKs/relations intact)
ALTER TABLE public.escolinhas
ADD COLUMN IF NOT EXISTS cnpj text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'escolinhas_cnpj_unique'
  ) THEN
    ALTER TABLE public.escolinhas
    ADD CONSTRAINT escolinhas_cnpj_unique UNIQUE (cnpj);
  END IF;
END $$;

-- Helper functions to avoid RLS policy recursion
CREATE OR REPLACE FUNCTION public.is_admin_of_escolinha(_escolinha_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.escolinhas e
    WHERE e.id = _escolinha_id
      AND e.admin_user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_teacher_of_escolinha(_escolinha_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.professores p
    WHERE p.user_id = auth.uid()
      AND p.escolinha_id = _escolinha_id
  );
$$;

-- Fix recursion: escolinhas policy referenced professores, and professores policy referenced escolinhas.
-- Replace both with SECURITY DEFINER functions.

-- escolinhas: replace teacher visibility policy
DROP POLICY IF EXISTS "Professores podem ver sua escolinha" ON public.escolinhas;
CREATE POLICY "Professores podem ver sua escolinha"
ON public.escolinhas
FOR SELECT
TO authenticated
USING (public.is_teacher_of_escolinha(escolinhas.id));

-- professores: replace school-admin manage policy
DROP POLICY IF EXISTS "Admins de escolinha podem gerenciar professores" ON public.professores;
CREATE POLICY "Admins de escolinha podem gerenciar professores"
ON public.professores
FOR ALL
TO authenticated
USING (public.is_admin_of_escolinha(professores.escolinha_id))
WITH CHECK (public.is_admin_of_escolinha(professores.escolinha_id));

-- turmas: also switch to function to keep policies consistent and avoid future recursion chains
DROP POLICY IF EXISTS "Admins de escolinha podem gerenciar turmas da sua escolinha" ON public.turmas;
CREATE POLICY "Admins de escolinha podem gerenciar turmas da sua escolinha"
ON public.turmas
FOR ALL
TO authenticated
USING (public.is_admin_of_escolinha(turmas.escolinha_id))
WITH CHECK (public.is_admin_of_escolinha(turmas.escolinha_id));

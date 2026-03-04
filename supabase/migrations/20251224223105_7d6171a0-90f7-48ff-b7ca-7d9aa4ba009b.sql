-- Fix RLS infinite recursion: guardian-specific SELECT/INSERT policies were created without guarding by role,
-- so they were evaluated for all authenticated users (including admin/school), which caused loops via crianca_responsavel.
-- We wrap the guardian policies with a CASE on has_role(..., 'guardian') so they short-circuit for non-guardians.

-- crianca_escolinha
ALTER POLICY "Responsaveis podem ver crianca_escolinha dos filhos" ON public.crianca_escolinha TO authenticated;
ALTER POLICY "Responsaveis podem ver crianca_escolinha dos filhos" ON public.crianca_escolinha
USING (
  CASE
    WHEN public.has_role(auth.uid(), 'guardian'::public.user_role) THEN
      crianca_id IN (
        SELECT cr.crianca_id
        FROM public.crianca_responsavel cr
        WHERE cr.responsavel_id = public.get_responsavel_id(auth.uid())
      )
    ELSE false
  END
);

-- crianca_turma
ALTER POLICY "Responsaveis podem ver turmas dos filhos" ON public.crianca_turma TO authenticated;
ALTER POLICY "Responsaveis podem ver turmas dos filhos" ON public.crianca_turma
USING (
  CASE
    WHEN public.has_role(auth.uid(), 'guardian'::public.user_role) THEN
      crianca_id IN (
        SELECT cr.crianca_id
        FROM public.crianca_responsavel cr
        WHERE cr.responsavel_id = public.get_responsavel_id(auth.uid())
      )
    ELSE false
  END
);

-- turmas
ALTER POLICY "Responsaveis podem ver turmas dos filhos" ON public.turmas TO authenticated;
ALTER POLICY "Responsaveis podem ver turmas dos filhos" ON public.turmas
USING (
  CASE
    WHEN public.has_role(auth.uid(), 'guardian'::public.user_role) THEN
      id IN (
        SELECT ct.turma_id
        FROM public.crianca_turma ct
        WHERE ct.crianca_id IN (
          SELECT cr.crianca_id
          FROM public.crianca_responsavel cr
          WHERE cr.responsavel_id = public.get_responsavel_id(auth.uid())
        )
      )
    ELSE false
  END
);

-- professores
ALTER POLICY "Responsaveis podem ver professores das turmas dos filhos" ON public.professores TO authenticated;
ALTER POLICY "Responsaveis podem ver professores das turmas dos filhos" ON public.professores
USING (
  CASE
    WHEN public.has_role(auth.uid(), 'guardian'::public.user_role) THEN
      id IN (
        SELECT t.professor_id
        FROM public.turmas t
        WHERE t.id IN (
          SELECT ct.turma_id
          FROM public.crianca_turma ct
          WHERE ct.crianca_id IN (
            SELECT cr.crianca_id
            FROM public.crianca_responsavel cr
            WHERE cr.responsavel_id = public.get_responsavel_id(auth.uid())
          )
        )
      )
    ELSE false
  END
);

-- escolinhas
ALTER POLICY "Responsaveis podem ver escolinhas dos filhos" ON public.escolinhas TO authenticated;
ALTER POLICY "Responsaveis podem ver escolinhas dos filhos" ON public.escolinhas
USING (
  CASE
    WHEN public.has_role(auth.uid(), 'guardian'::public.user_role) THEN
      id IN (
        SELECT ce.escolinha_id
        FROM public.crianca_escolinha ce
        WHERE ce.crianca_id IN (
          SELECT cr.crianca_id
          FROM public.crianca_responsavel cr
          WHERE cr.responsavel_id = public.get_responsavel_id(auth.uid())
        )
      )
    ELSE false
  END
);

-- presencas (INSERT)
ALTER POLICY "Responsaveis podem inserir presenca dos filhos" ON public.presencas TO authenticated;
ALTER POLICY "Responsaveis podem inserir presenca dos filhos" ON public.presencas
WITH CHECK (
  CASE
    WHEN public.has_role(auth.uid(), 'guardian'::public.user_role) THEN
      crianca_id IN (
        SELECT cr.crianca_id
        FROM public.crianca_responsavel cr
        WHERE cr.responsavel_id = public.get_responsavel_id(auth.uid())
      )
    ELSE false
  END
);

-- Optional hardening: ensure crianca_responsavel guardian SELECT policy only applies to guardians
ALTER POLICY "Responsaveis podem ver seus vinculos" ON public.crianca_responsavel TO authenticated;
ALTER POLICY "Responsaveis podem ver seus vinculos" ON public.crianca_responsavel
USING (
  CASE
    WHEN public.has_role(auth.uid(), 'guardian'::public.user_role) THEN
      responsavel_id = public.get_responsavel_id(auth.uid())
    ELSE false
  END
);

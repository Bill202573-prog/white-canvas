-- Fix data visibility by recreating key RLS policies as PERMISSIVE (default)

-- PROFILES
DROP POLICY IF EXISTS "Admins podem ver todos os profiles" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios podem atualizar seu proprio profile" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios podem inserir seu proprio profile" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios podem ver seu proprio profile" ON public.profiles;

CREATE POLICY "Admins podem ver todos os profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Usuarios podem ver seu proprio profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Usuarios podem inserir seu proprio profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuarios podem atualizar seu proprio profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- USER_ROLES
DROP POLICY IF EXISTS "Admins podem ver todas as roles" ON public.user_roles;
DROP POLICY IF EXISTS "Usuarios podem ver suas proprias roles" ON public.user_roles;

CREATE POLICY "Admins podem ver todas as roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Usuarios podem ver suas proprias roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- ESCOLINHAS
DROP POLICY IF EXISTS "Admins de escolinha podem atualizar sua escolinha" ON public.escolinhas;
DROP POLICY IF EXISTS "Admins de escolinha podem ver professores da sua escolinha" ON public.escolinhas;
DROP POLICY IF EXISTS "Admins de escolinha podem ver sua escolinha" ON public.escolinhas;
DROP POLICY IF EXISTS "Admins podem gerenciar escolinhas" ON public.escolinhas;
DROP POLICY IF EXISTS "Admins podem ver todas as escolinhas" ON public.escolinhas;
DROP POLICY IF EXISTS "Professores podem ver sua escolinha" ON public.escolinhas;

CREATE POLICY "Admins podem gerenciar escolinhas"
ON public.escolinhas
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins podem ver todas as escolinhas"
ON public.escolinhas
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins de escolinha podem ver sua escolinha"
ON public.escolinhas
FOR SELECT
TO authenticated
USING (admin_user_id = auth.uid());

-- (mantido por compatibilidade com o nome antigo, mesma regra)
CREATE POLICY "Admins de escolinha podem ver professores da sua escolinha"
ON public.escolinhas
FOR SELECT
TO authenticated
USING (admin_user_id = auth.uid());

CREATE POLICY "Admins de escolinha podem atualizar sua escolinha"
ON public.escolinhas
FOR UPDATE
TO authenticated
USING (admin_user_id = auth.uid())
WITH CHECK (admin_user_id = auth.uid());

CREATE POLICY "Professores podem ver sua escolinha"
ON public.escolinhas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.professores
    WHERE professores.user_id = auth.uid()
      AND professores.escolinha_id = escolinhas.id
  )
);

-- PROFESSORES
DROP POLICY IF EXISTS "Admins de escolinha podem gerenciar professores" ON public.professores;
DROP POLICY IF EXISTS "Admins podem gerenciar professores" ON public.professores;
DROP POLICY IF EXISTS "Professores podem ver seu proprio cadastro" ON public.professores;

CREATE POLICY "Admins podem gerenciar professores"
ON public.professores
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins de escolinha podem gerenciar professores"
ON public.professores
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.escolinhas
    WHERE escolinhas.id = professores.escolinha_id
      AND escolinhas.admin_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.escolinhas
    WHERE escolinhas.id = professores.escolinha_id
      AND escolinhas.admin_user_id = auth.uid()
  )
);

CREATE POLICY "Professores podem ver seu proprio cadastro"
ON public.professores
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- TURMAS
DROP POLICY IF EXISTS "Admins de escolinha podem gerenciar turmas da sua escolinha" ON public.turmas;
DROP POLICY IF EXISTS "Admins podem gerenciar todas as turmas" ON public.turmas;
DROP POLICY IF EXISTS "Professores podem ver suas turmas" ON public.turmas;

CREATE POLICY "Admins podem gerenciar todas as turmas"
ON public.turmas
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins de escolinha podem gerenciar turmas da sua escolinha"
ON public.turmas
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.escolinhas
    WHERE escolinhas.id = turmas.escolinha_id
      AND escolinhas.admin_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.escolinhas
    WHERE escolinhas.id = turmas.escolinha_id
      AND escolinhas.admin_user_id = auth.uid()
  )
);

CREATE POLICY "Professores podem ver suas turmas"
ON public.turmas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.professores
    WHERE professores.id = turmas.professor_id
      AND professores.user_id = auth.uid()
  )
);

-- AULAS (adiciona permissão para a escolinha gerir as aulas das suas turmas)
DROP POLICY IF EXISTS "Admins podem gerenciar todas as aulas" ON public.aulas;
DROP POLICY IF EXISTS "Professores podem gerenciar aulas das suas turmas" ON public.aulas;
DROP POLICY IF EXISTS "Responsaveis podem ver aulas das turmas dos filhos" ON public.aulas;
DROP POLICY IF EXISTS "Admins de escolinha podem gerenciar aulas das suas turmas" ON public.aulas;

CREATE POLICY "Admins podem gerenciar todas as aulas"
ON public.aulas
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins de escolinha podem gerenciar aulas das suas turmas"
ON public.aulas
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.turmas t
    JOIN public.escolinhas e ON e.id = t.escolinha_id
    WHERE t.id = aulas.turma_id
      AND e.admin_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.turmas t
    JOIN public.escolinhas e ON e.id = t.escolinha_id
    WHERE t.id = aulas.turma_id
      AND e.admin_user_id = auth.uid()
  )
);

CREATE POLICY "Professores podem gerenciar aulas das suas turmas"
ON public.aulas
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.turmas t
    JOIN public.professores p ON p.id = t.professor_id
    WHERE t.id = aulas.turma_id
      AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.turmas t
    JOIN public.professores p ON p.id = t.professor_id
    WHERE t.id = aulas.turma_id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Responsaveis podem ver aulas das turmas dos filhos"
ON public.aulas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.crianca_turma ct
    JOIN public.crianca_responsavel cr ON cr.crianca_id = ct.crianca_id
    JOIN public.responsaveis r ON r.id = cr.responsavel_id
    WHERE ct.turma_id = aulas.turma_id
      AND r.user_id = auth.uid()
  )
);

-- PRESENCAS (adiciona permissão para a escolinha gerir presenças das suas turmas)
DROP POLICY IF EXISTS "Admins podem gerenciar todas as presencas" ON public.presencas;
DROP POLICY IF EXISTS "Professores podem gerenciar presencas das suas aulas" ON public.presencas;
DROP POLICY IF EXISTS "Responsaveis podem atualizar confirmacao de presenca" ON public.presencas;
DROP POLICY IF EXISTS "Responsaveis podem ver e confirmar presenca dos filhos" ON public.presencas;
DROP POLICY IF EXISTS "Admins de escolinha podem gerenciar presencas das suas turmas" ON public.presencas;

CREATE POLICY "Admins podem gerenciar todas as presencas"
ON public.presencas
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins de escolinha podem gerenciar presencas das suas turmas"
ON public.presencas
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.aulas a
    JOIN public.turmas t ON t.id = a.turma_id
    JOIN public.escolinhas e ON e.id = t.escolinha_id
    WHERE a.id = presencas.aula_id
      AND e.admin_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.aulas a
    JOIN public.turmas t ON t.id = a.turma_id
    JOIN public.escolinhas e ON e.id = t.escolinha_id
    WHERE a.id = presencas.aula_id
      AND e.admin_user_id = auth.uid()
  )
);

CREATE POLICY "Professores podem gerenciar presencas das suas aulas"
ON public.presencas
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.aulas a
    JOIN public.turmas t ON t.id = a.turma_id
    JOIN public.professores p ON p.id = t.professor_id
    WHERE a.id = presencas.aula_id
      AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.aulas a
    JOIN public.turmas t ON t.id = a.turma_id
    JOIN public.professores p ON p.id = t.professor_id
    WHERE a.id = presencas.aula_id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Responsaveis podem ver e confirmar presenca dos filhos"
ON public.presencas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.crianca_responsavel cr
    JOIN public.responsaveis r ON r.id = cr.responsavel_id
    WHERE cr.crianca_id = presencas.crianca_id
      AND r.user_id = auth.uid()
  )
);

CREATE POLICY "Responsaveis podem atualizar confirmacao de presenca"
ON public.presencas
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.crianca_responsavel cr
    JOIN public.responsaveis r ON r.id = cr.responsavel_id
    WHERE cr.crianca_id = presencas.crianca_id
      AND r.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.crianca_responsavel cr
    JOIN public.responsaveis r ON r.id = cr.responsavel_id
    WHERE cr.crianca_id = presencas.crianca_id
      AND r.user_id = auth.uid()
  )
);
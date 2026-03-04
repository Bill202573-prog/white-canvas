
-- =====================================================
-- PASSO 1: Criar funções helper SIMPLES sem recursão
-- =====================================================

-- Função para verificar se usuário é responsável e obter seu ID
CREATE OR REPLACE FUNCTION public.get_responsavel_id_simple(user_uuid uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM public.responsaveis WHERE user_id = user_uuid LIMIT 1;
$$;

-- Função para obter IDs das crianças do responsável (sem joins circulares)
CREATE OR REPLACE FUNCTION public.get_criancas_do_responsavel(user_uuid uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT cr.crianca_id 
  FROM public.crianca_responsavel cr
  JOIN public.responsaveis r ON r.id = cr.responsavel_id
  WHERE r.user_id = user_uuid;
$$;

-- Função para obter IDs das aulas das crianças do responsável
CREATE OR REPLACE FUNCTION public.get_aulas_do_responsavel(user_uuid uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT DISTINCT a.id
  FROM public.aulas a
  JOIN public.crianca_turma ct ON ct.turma_id = a.turma_id AND ct.ativo = true
  WHERE ct.crianca_id IN (SELECT public.get_criancas_do_responsavel(user_uuid));
$$;

-- =====================================================
-- PASSO 2: Remover policies problemáticas de TURMAS
-- =====================================================

DROP POLICY IF EXISTS "Responsaveis podem ver turmas dos filhos" ON public.turmas;

-- Nova policy SIMPLES: responsável vê turmas através de função
CREATE POLICY "Responsaveis podem ver turmas dos filhos"
ON public.turmas
FOR SELECT
USING (
  CASE 
    WHEN public.has_role(auth.uid(), 'guardian') THEN
      id IN (
        SELECT ct.turma_id 
        FROM public.crianca_turma ct 
        WHERE ct.crianca_id IN (SELECT public.get_criancas_do_responsavel(auth.uid()))
        AND ct.ativo = true
      )
    ELSE false
  END
);

-- =====================================================
-- PASSO 3: Remover policies problemáticas de AULAS
-- =====================================================

DROP POLICY IF EXISTS "Responsaveis podem ver aulas das turmas dos filhos" ON public.aulas;

-- Nova policy SIMPLES: responsável vê aulas através de função
CREATE POLICY "Responsaveis podem ver aulas das turmas dos filhos"
ON public.aulas
FOR SELECT
USING (
  CASE 
    WHEN public.has_role(auth.uid(), 'guardian') THEN
      id IN (SELECT public.get_aulas_do_responsavel(auth.uid()))
    ELSE false
  END
);

-- =====================================================
-- PASSO 4: Simplificar policies de PRESENCAS
-- =====================================================

DROP POLICY IF EXISTS "Responsaveis podem ver e confirmar presenca dos filhos" ON public.presencas;
DROP POLICY IF EXISTS "Responsaveis podem atualizar confirmacao de presenca" ON public.presencas;
DROP POLICY IF EXISTS "Responsaveis podem inserir presenca dos filhos" ON public.presencas;

-- Policy SELECT simples
CREATE POLICY "Responsaveis podem ver presenca dos filhos"
ON public.presencas
FOR SELECT
USING (
  CASE 
    WHEN public.has_role(auth.uid(), 'guardian') THEN
      crianca_id IN (SELECT public.get_criancas_do_responsavel(auth.uid()))
    ELSE false
  END
);

-- Policy UPDATE simples
CREATE POLICY "Responsaveis podem atualizar presenca dos filhos"
ON public.presencas
FOR UPDATE
USING (
  crianca_id IN (SELECT public.get_criancas_do_responsavel(auth.uid()))
)
WITH CHECK (
  crianca_id IN (SELECT public.get_criancas_do_responsavel(auth.uid()))
);

-- Policy INSERT simples
CREATE POLICY "Responsaveis podem inserir presenca dos filhos"
ON public.presencas
FOR INSERT
WITH CHECK (
  CASE 
    WHEN public.has_role(auth.uid(), 'guardian') THEN
      crianca_id IN (SELECT public.get_criancas_do_responsavel(auth.uid()))
    ELSE false
  END
);

-- =====================================================
-- PASSO 5: Simplificar policies de CRIANCAS
-- =====================================================

DROP POLICY IF EXISTS "Responsaveis podem ver suas criancas" ON public.criancas;

CREATE POLICY "Responsaveis podem ver suas criancas"
ON public.criancas
FOR SELECT
USING (
  CASE 
    WHEN public.has_role(auth.uid(), 'guardian') THEN
      id IN (SELECT public.get_criancas_do_responsavel(auth.uid()))
    ELSE false
  END
);

-- =====================================================
-- PASSO 6: Simplificar policies de CRIANCA_TURMA
-- =====================================================

DROP POLICY IF EXISTS "Responsaveis podem ver turmas dos filhos" ON public.crianca_turma;

CREATE POLICY "Responsaveis podem ver turmas dos filhos"
ON public.crianca_turma
FOR SELECT
USING (
  CASE 
    WHEN public.has_role(auth.uid(), 'guardian') THEN
      crianca_id IN (SELECT public.get_criancas_do_responsavel(auth.uid()))
    ELSE false
  END
);

-- =====================================================
-- PASSO 7: Simplificar policies de CRIANCA_ESCOLINHA
-- =====================================================

DROP POLICY IF EXISTS "Responsaveis podem ver crianca_escolinha dos filhos" ON public.crianca_escolinha;

CREATE POLICY "Responsaveis podem ver crianca_escolinha dos filhos"
ON public.crianca_escolinha
FOR SELECT
USING (
  CASE 
    WHEN public.has_role(auth.uid(), 'guardian') THEN
      crianca_id IN (SELECT public.get_criancas_do_responsavel(auth.uid()))
    ELSE false
  END
);

-- =====================================================
-- PASSO 8: Simplificar policies de CRIANCA_RESPONSAVEL
-- =====================================================

DROP POLICY IF EXISTS "Responsaveis podem ver seus vinculos" ON public.crianca_responsavel;

CREATE POLICY "Responsaveis podem ver seus vinculos"
ON public.crianca_responsavel
FOR SELECT
USING (
  CASE 
    WHEN public.has_role(auth.uid(), 'guardian') THEN
      responsavel_id = public.get_responsavel_id_simple(auth.uid())
    ELSE false
  END
);

-- =====================================================
-- PASSO 9: Simplificar policies de ESCOLINHAS
-- =====================================================

DROP POLICY IF EXISTS "Responsaveis podem ver escolinhas dos filhos" ON public.escolinhas;

CREATE POLICY "Responsaveis podem ver escolinhas dos filhos"
ON public.escolinhas
FOR SELECT
USING (
  CASE 
    WHEN public.has_role(auth.uid(), 'guardian') THEN
      id IN (
        SELECT ce.escolinha_id 
        FROM public.crianca_escolinha ce 
        WHERE ce.crianca_id IN (SELECT public.get_criancas_do_responsavel(auth.uid()))
        AND ce.ativo = true
      )
    ELSE false
  END
);

-- =====================================================
-- PASSO 10: Simplificar policies de PROFESSORES
-- =====================================================

DROP POLICY IF EXISTS "Responsaveis podem ver professores das turmas dos filhos" ON public.professores;

CREATE POLICY "Responsaveis podem ver professores das turmas dos filhos"
ON public.professores
FOR SELECT
USING (
  CASE 
    WHEN public.has_role(auth.uid(), 'guardian') THEN
      id IN (
        SELECT t.professor_id 
        FROM public.turmas t
        JOIN public.crianca_turma ct ON ct.turma_id = t.id
        WHERE ct.crianca_id IN (SELECT public.get_criancas_do_responsavel(auth.uid()))
        AND ct.ativo = true
      )
    ELSE false
  END
);

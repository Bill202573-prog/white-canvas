-- Add RLS policy for responsaveis to see crianca_turma of their children
CREATE POLICY "Responsaveis podem ver turmas dos filhos" 
ON public.crianca_turma 
FOR SELECT 
USING (crianca_id IN (
  SELECT cr.crianca_id 
  FROM crianca_responsavel cr 
  WHERE cr.responsavel_id = get_responsavel_id(auth.uid())
));

-- Add RLS policy for responsaveis to see turmas of their children
CREATE POLICY "Responsaveis podem ver turmas dos filhos" 
ON public.turmas 
FOR SELECT 
USING (id IN (
  SELECT ct.turma_id 
  FROM crianca_turma ct 
  WHERE ct.crianca_id IN (
    SELECT cr.crianca_id 
    FROM crianca_responsavel cr 
    WHERE cr.responsavel_id = get_responsavel_id(auth.uid())
  )
));

-- Add RLS policy for responsaveis to see professors of their children's turmas
CREATE POLICY "Responsaveis podem ver professores das turmas dos filhos" 
ON public.professores 
FOR SELECT 
USING (id IN (
  SELECT t.professor_id 
  FROM turmas t 
  WHERE t.id IN (
    SELECT ct.turma_id 
    FROM crianca_turma ct 
    WHERE ct.crianca_id IN (
      SELECT cr.crianca_id 
      FROM crianca_responsavel cr 
      WHERE cr.responsavel_id = get_responsavel_id(auth.uid())
    )
  )
));

-- Add RLS policy for responsaveis to see escolinhas of their children
CREATE POLICY "Responsaveis podem ver escolinhas dos filhos" 
ON public.escolinhas 
FOR SELECT 
USING (id IN (
  SELECT ce.escolinha_id 
  FROM crianca_escolinha ce 
  WHERE ce.crianca_id IN (
    SELECT cr.crianca_id 
    FROM crianca_responsavel cr 
    WHERE cr.responsavel_id = get_responsavel_id(auth.uid())
  )
));

-- Add RLS policy for responsaveis to see crianca_escolinha of their children
CREATE POLICY "Responsaveis podem ver crianca_escolinha dos filhos" 
ON public.crianca_escolinha 
FOR SELECT 
USING (crianca_id IN (
  SELECT cr.crianca_id 
  FROM crianca_responsavel cr 
  WHERE cr.responsavel_id = get_responsavel_id(auth.uid())
));

-- Add RLS policy for responsaveis to INSERT presencas for their children
CREATE POLICY "Responsaveis podem inserir presenca dos filhos" 
ON public.presencas 
FOR INSERT 
WITH CHECK (crianca_id IN (
  SELECT cr.crianca_id 
  FROM crianca_responsavel cr 
  WHERE cr.responsavel_id = get_responsavel_id(auth.uid())
));
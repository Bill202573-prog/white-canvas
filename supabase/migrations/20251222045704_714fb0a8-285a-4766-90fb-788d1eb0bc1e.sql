-- Drop and recreate RLS policies as PERMISSIVE for crianca_escolinha table
DROP POLICY IF EXISTS "Admins de escolinha podem gerenciar vinculos da sua escolinha" ON crianca_escolinha;
DROP POLICY IF EXISTS "Admins podem gerenciar vinculos crianca-escolinha" ON crianca_escolinha;

CREATE POLICY "Admins podem gerenciar vinculos crianca-escolinha" 
ON crianca_escolinha
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins de escolinha podem gerenciar vinculos da sua escolinha" 
ON crianca_escolinha
FOR ALL 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM escolinhas
  WHERE escolinhas.id = crianca_escolinha.escolinha_id 
  AND escolinhas.admin_user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM escolinhas
  WHERE escolinhas.id = crianca_escolinha.escolinha_id 
  AND escolinhas.admin_user_id = auth.uid()
));

-- Drop and recreate RLS policies as PERMISSIVE for criancas table
DROP POLICY IF EXISTS "Admins de escolinha podem gerenciar criancas da sua escolinha" ON criancas;
DROP POLICY IF EXISTS "Admins podem gerenciar todas as criancas" ON criancas;
DROP POLICY IF EXISTS "Professores podem ver criancas das suas turmas" ON criancas;
DROP POLICY IF EXISTS "Responsaveis podem ver suas criancas" ON criancas;

CREATE POLICY "Admins podem gerenciar todas as criancas" 
ON criancas
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins de escolinha podem gerenciar criancas da sua escolinha" 
ON criancas
FOR ALL 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM crianca_escolinha ce
  JOIN escolinhas e ON e.id = ce.escolinha_id
  WHERE ce.crianca_id = criancas.id 
  AND e.admin_user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM crianca_escolinha ce
  JOIN escolinhas e ON e.id = ce.escolinha_id
  WHERE ce.crianca_id = criancas.id 
  AND e.admin_user_id = auth.uid()
));

CREATE POLICY "Professores podem ver criancas das suas turmas" 
ON criancas
FOR SELECT 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM crianca_turma ct
  JOIN turmas t ON t.id = ct.turma_id
  JOIN professores p ON p.id = t.professor_id
  WHERE ct.crianca_id = criancas.id 
  AND p.user_id = auth.uid()
));

CREATE POLICY "Responsaveis podem ver suas criancas" 
ON criancas
FOR SELECT 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM crianca_responsavel cr
  JOIN responsaveis r ON r.id = cr.responsavel_id
  WHERE cr.crianca_id = criancas.id 
  AND r.user_id = auth.uid()
));

-- Drop and recreate RLS policies for crianca_turma table
DROP POLICY IF EXISTS "Admins podem gerenciar vinculos crianca-turma" ON crianca_turma;
DROP POLICY IF EXISTS "Professores podem ver alunos das suas turmas" ON crianca_turma;

CREATE POLICY "Admins podem gerenciar vinculos crianca-turma" 
ON crianca_turma
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins de escolinha podem gerenciar crianca-turma" 
ON crianca_turma
FOR ALL 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM turmas t
  JOIN escolinhas e ON e.id = t.escolinha_id
  WHERE t.id = crianca_turma.turma_id 
  AND e.admin_user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM turmas t
  JOIN escolinhas e ON e.id = t.escolinha_id
  WHERE t.id = crianca_turma.turma_id 
  AND e.admin_user_id = auth.uid()
));

CREATE POLICY "Professores podem ver alunos das suas turmas" 
ON crianca_turma
FOR SELECT 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM turmas t
  JOIN professores p ON p.id = t.professor_id
  WHERE t.id = crianca_turma.turma_id 
  AND p.user_id = auth.uid()
));

-- Drop and recreate RLS policies for crianca_responsavel table
DROP POLICY IF EXISTS "Admins podem gerenciar vinculos crianca-responsavel" ON crianca_responsavel;
DROP POLICY IF EXISTS "Responsaveis podem ver seus vinculos" ON crianca_responsavel;

CREATE POLICY "Admins podem gerenciar vinculos crianca-responsavel" 
ON crianca_responsavel
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins de escolinha podem gerenciar crianca-responsavel" 
ON crianca_responsavel
FOR ALL 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM crianca_escolinha ce
  JOIN escolinhas e ON e.id = ce.escolinha_id
  WHERE ce.crianca_id = crianca_responsavel.crianca_id 
  AND e.admin_user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM crianca_escolinha ce
  JOIN escolinhas e ON e.id = ce.escolinha_id
  WHERE ce.crianca_id = crianca_responsavel.crianca_id 
  AND e.admin_user_id = auth.uid()
));

CREATE POLICY "Responsaveis podem ver seus vinculos" 
ON crianca_responsavel
FOR SELECT 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM responsaveis
  WHERE responsaveis.id = crianca_responsavel.responsavel_id 
  AND responsaveis.user_id = auth.uid()
));

-- Drop and recreate RLS policies for responsaveis table
DROP POLICY IF EXISTS "Admins podem gerenciar responsaveis" ON responsaveis;
DROP POLICY IF EXISTS "Responsaveis podem ver seu proprio cadastro" ON responsaveis;

CREATE POLICY "Admins podem gerenciar responsaveis" 
ON responsaveis
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins de escolinha podem ver responsaveis" 
ON responsaveis
FOR SELECT 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM crianca_responsavel cr
  JOIN crianca_escolinha ce ON ce.crianca_id = cr.crianca_id
  JOIN escolinhas e ON e.id = ce.escolinha_id
  WHERE cr.responsavel_id = responsaveis.id 
  AND e.admin_user_id = auth.uid()
));

CREATE POLICY "Responsaveis podem ver seu proprio cadastro" 
ON responsaveis
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());
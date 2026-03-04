-- Fix 1: Restrict conquistas_coletivas to authenticated school users only
DROP POLICY IF EXISTS "conquistas_coletivas_select_public" ON public.conquistas_coletivas;
DROP POLICY IF EXISTS "Public read access for conquistas_coletivas" ON public.conquistas_coletivas;
DROP POLICY IF EXISTS "Anyone can view collective achievements" ON public.conquistas_coletivas;

-- Create policy to restrict SELECT to authenticated users from the specific school
CREATE POLICY "School users can view their conquistas"
ON public.conquistas_coletivas
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    -- School admins can view their school's conquistas
    is_admin_of_escolinha(escolinha_id)
    OR
    -- Teachers can view their school's conquistas  
    is_teacher_of_escolinha(escolinha_id)
    OR
    -- Guardians can view conquistas from their children's schools
    guardian_can_access_escolinha(escolinha_id)
  )
);

-- Keep existing INSERT/UPDATE/DELETE policies for school admins only

-- Fix 2: Make child-photos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'child-photos';

-- Remove public access policy for child-photos
DROP POLICY IF EXISTS "Child photos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public can view child photos" ON storage.objects;

-- Create RLS policies for authenticated access to child photos
-- Guardians can view their children's photos
CREATE POLICY "Guardians can view child photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'child-photos'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM criancas c
    JOIN crianca_responsavel cr ON cr.crianca_id = c.id
    JOIN responsaveis r ON r.id = cr.responsavel_id
    WHERE r.user_id = auth.uid()
    AND (storage.foldername(name))[1] = c.id::text
  )
);

-- School admins can view photos of students in their schools
CREATE POLICY "School admins can view student photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'child-photos'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM criancas c
    JOIN crianca_escolinha ce ON ce.crianca_id = c.id
    JOIN escolinhas e ON e.id = ce.escolinha_id
    WHERE e.admin_user_id = auth.uid()
    AND (storage.foldername(name))[1] = c.id::text
  )
);

-- Teachers can view photos of students in their school
CREATE POLICY "Teachers can view student photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'child-photos'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM criancas c
    JOIN crianca_escolinha ce ON ce.crianca_id = c.id
    JOIN professores p ON p.escolinha_id = ce.escolinha_id
    WHERE p.user_id = auth.uid()
    AND p.ativo = true
    AND (storage.foldername(name))[1] = c.id::text
  )
);
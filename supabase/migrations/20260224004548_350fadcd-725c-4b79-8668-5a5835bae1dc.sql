
-- 1. Create a helper function to check if user owns a perfil_atleta for a crianca
CREATE OR REPLACE FUNCTION public.is_perfil_atleta_owner(check_user_id uuid, check_crianca_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfil_atleta
    WHERE user_id = check_user_id
      AND crianca_id = check_crianca_id
  )
$$;

-- 2. Add INSERT policy for Carreira users on atividades_externas
CREATE POLICY "Carreira users can create atividades for their athletes"
ON public.atividades_externas
FOR INSERT
TO authenticated
WITH CHECK (
  is_perfil_atleta_owner(auth.uid(), crianca_id)
  AND has_atividades_externas_access_for_child(auth.uid(), crianca_id)
  AND criado_por = auth.uid()
  AND visibilidade = 'privado'
);

-- 3. Add SELECT policy for Carreira users on atividades_externas
CREATE POLICY "Carreira users can view atividades of their athletes"
ON public.atividades_externas
FOR SELECT
TO authenticated
USING (
  is_perfil_atleta_owner(auth.uid(), crianca_id)
);

-- 4. Add UPDATE policy for Carreira users on atividades_externas
CREATE POLICY "Carreira users can update their atividades"
ON public.atividades_externas
FOR UPDATE
TO authenticated
USING (
  is_perfil_atleta_owner(auth.uid(), crianca_id)
  AND criado_por = auth.uid()
)
WITH CHECK (visibilidade = 'privado');

-- 5. Add DELETE policy for Carreira users on atividades_externas
CREATE POLICY "Carreira users can delete their atividades"
ON public.atividades_externas
FOR DELETE
TO authenticated
USING (
  is_perfil_atleta_owner(auth.uid(), crianca_id)
  AND criado_por = auth.uid()
);

-- 6. Add storage policies for atividade-externa-fotos for Carreira users
CREATE POLICY "Carreira users can upload atividade photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'atividade-externa-fotos'
  AND public.is_perfil_atleta_owner(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Carreira users can view atividade photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'atividade-externa-fotos'
  AND public.is_perfil_atleta_owner(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

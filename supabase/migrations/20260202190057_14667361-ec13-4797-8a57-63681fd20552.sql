-- Create storage bucket for activity photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('atividade-externa-fotos', 'atividade-externa-fotos', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for the storage bucket
-- Allow authenticated users to upload photos to their own activities
CREATE POLICY "Users can upload activity photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'atividade-externa-fotos' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.atividades_externas ae
    WHERE ae.id::text = (storage.foldername(name))[1]
    AND ae.criado_por = auth.uid()
  )
);

-- Allow users to view photos of their own activities
CREATE POLICY "Users can view their activity photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'atividade-externa-fotos' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.atividades_externas ae
    WHERE ae.id::text = (storage.foldername(name))[1]
    AND ae.criado_por = auth.uid()
  )
);

-- Allow users to delete photos of their own activities
CREATE POLICY "Users can delete their activity photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'atividade-externa-fotos' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.atividades_externas ae
    WHERE ae.id::text = (storage.foldername(name))[1]
    AND ae.criado_por = auth.uid()
  )
);

-- Add photos column to atividades_externas
ALTER TABLE public.atividades_externas
ADD COLUMN IF NOT EXISTS fotos_urls text[] DEFAULT '{}';

-- Add boolean column for future public visibility (always false for now)
ALTER TABLE public.atividades_externas
ADD COLUMN IF NOT EXISTS tornar_publico boolean DEFAULT false;

-- Add constraint to prevent public activities for now
ALTER TABLE public.atividades_externas
ADD CONSTRAINT atividades_externas_no_public_yet CHECK (tornar_publico = false);
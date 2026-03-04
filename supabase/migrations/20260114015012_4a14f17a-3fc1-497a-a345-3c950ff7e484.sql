-- Create table for storing document references
CREATE TABLE public.escola_documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escolinha_id UUID NOT NULL REFERENCES public.escolinhas(id) ON DELETE CASCADE,
  tipo_documento TEXT NOT NULL,
  nome_arquivo TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  tamanho_bytes INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.escola_documentos ENABLE ROW LEVEL SECURITY;

-- RLS policies - school admin can manage their documents
CREATE POLICY "School admin can view own documents"
  ON public.escola_documentos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.escolinhas e
      WHERE e.id = escola_documentos.escolinha_id
      AND e.admin_user_id = auth.uid()
    )
  );

CREATE POLICY "School admin can insert own documents"
  ON public.escola_documentos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.escolinhas e
      WHERE e.id = escola_documentos.escolinha_id
      AND e.admin_user_id = auth.uid()
    )
  );

CREATE POLICY "School admin can delete own documents"
  ON public.escola_documentos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.escolinhas e
      WHERE e.id = escola_documentos.escolinha_id
      AND e.admin_user_id = auth.uid()
    )
  );

-- Platform admin can view all documents
CREATE POLICY "Admin can view all documents"
  ON public.escola_documentos
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for school documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('escola-documentos', 'escola-documentos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for the bucket
CREATE POLICY "School admin can upload documents"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'escola-documentos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "School admin can view own storage documents"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'escola-documentos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "School admin can delete own storage documents"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'escola-documentos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
-- Add logo_url column to escolinhas table
ALTER TABLE public.escolinhas
ADD COLUMN logo_url TEXT;

-- Create storage bucket for school logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('escolinha-logos', 'escolinha-logos', true);

-- Allow authenticated users to upload logos
CREATE POLICY "School admins can upload logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'escolinha-logos' 
  AND auth.uid() IN (
    SELECT admin_user_id FROM escolinhas WHERE admin_user_id IS NOT NULL
  )
);

-- Allow authenticated users to update their logos
CREATE POLICY "School admins can update logos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'escolinha-logos' 
  AND auth.uid() IN (
    SELECT admin_user_id FROM escolinhas WHERE admin_user_id IS NOT NULL
  )
);

-- Allow public read access to logos
CREATE POLICY "Anyone can view logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'escolinha-logos');

-- Allow school admins to delete their logos
CREATE POLICY "School admins can delete logos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'escolinha-logos' 
  AND auth.uid() IN (
    SELECT admin_user_id FROM escolinhas WHERE admin_user_id IS NOT NULL
  )
);
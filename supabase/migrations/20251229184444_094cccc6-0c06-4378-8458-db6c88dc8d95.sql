-- Create storage bucket for child photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('child-photos', 'child-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow guardians to upload photos for their children
CREATE POLICY "Guardians can upload child photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'child-photos' 
  AND auth.uid() IS NOT NULL
);

-- Allow public read access to child photos
CREATE POLICY "Child photos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'child-photos');

-- Allow guardians to update their uploaded photos
CREATE POLICY "Guardians can update child photos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'child-photos' AND auth.uid() IS NOT NULL);

-- Allow guardians to delete their uploaded photos
CREATE POLICY "Guardians can delete child photos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'child-photos' AND auth.uid() IS NOT NULL);
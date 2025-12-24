-- Create a private bucket for verification documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('verification-docs', 'verification-docs', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Users can upload their own verification documents
CREATE POLICY "Users upload own verification docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'verification-docs' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Only admins can view verification documents
CREATE POLICY "Admins view verification docs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-docs' AND 
  public.has_role(auth.uid(), 'admin')
);

-- Users can view their own verification documents
CREATE POLICY "Users view own verification docs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-docs' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete/replace their own verification documents
CREATE POLICY "Users delete own verification docs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'verification-docs' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
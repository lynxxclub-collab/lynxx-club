-- Make the chat-images bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'chat-images';

-- Drop any existing public SELECT policy
DROP POLICY IF EXISTS "Anyone can view chat images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for chat images" ON storage.objects;

-- Create authenticated SELECT policy - users can only view images they uploaded or received
CREATE POLICY "Users can view chat images in their conversations"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-images' AND (
    -- User uploaded the image (their folder)
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- User is a participant in a conversation where this image was sent
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversations c ON m.conversation_id = c.id
      WHERE m.message_type = 'image'
        AND m.content LIKE '%' || name || '%'
        AND (c.seeker_id = auth.uid() OR c.earner_id = auth.uid())
    )
  )
);
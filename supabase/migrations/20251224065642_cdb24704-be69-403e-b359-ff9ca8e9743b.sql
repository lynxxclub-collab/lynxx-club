-- Add survey columns to success_stories table
ALTER TABLE public.success_stories
ADD COLUMN how_we_met TEXT,
ADD COLUMN helpful_features JSONB,
ADD COLUMN first_date_type TEXT,
ADD COLUMN days_until_first_date INTEGER,
ADD COLUMN share_story BOOLEAN DEFAULT false,
ADD COLUMN share_anonymously BOOLEAN DEFAULT false,
ADD COLUMN improvement_suggestions TEXT,
ADD COLUMN initiator_photo_url TEXT,
ADD COLUMN partner_photo_url TEXT,
ADD COLUMN initiator_gift_card_email TEXT,
ADD COLUMN partner_gift_card_email TEXT,
ADD COLUMN survey_completed_at TIMESTAMPTZ;

-- Create storage bucket for success story photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('success-stories', 'success-stories', true);

-- Storage policies for success-stories bucket
CREATE POLICY "Users can upload their own success story photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'success-stories' AND 
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Success story photos are publicly viewable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'success-stories');

CREATE POLICY "Users can update their own success story photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'success-stories' AND 
  auth.uid()::text = (storage.foldername(name))[2]
);

CREATE POLICY "Users can delete their own success story photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'success-stories' AND 
  auth.uid()::text = (storage.foldername(name))[2]
);
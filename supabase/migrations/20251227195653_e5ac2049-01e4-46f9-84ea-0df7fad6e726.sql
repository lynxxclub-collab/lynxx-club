-- Add meeting token columns to video_dates table
ALTER TABLE public.video_dates 
ADD COLUMN IF NOT EXISTS seeker_meeting_token TEXT,
ADD COLUMN IF NOT EXISTS earner_meeting_token TEXT;
-- Add recording-related columns to video_dates table
ALTER TABLE public.video_dates ADD COLUMN IF NOT EXISTS recording_consent_seeker BOOLEAN DEFAULT FALSE;
ALTER TABLE public.video_dates ADD COLUMN IF NOT EXISTS recording_consent_earner BOOLEAN DEFAULT FALSE;
ALTER TABLE public.video_dates ADD COLUMN IF NOT EXISTS recording_id TEXT;
ALTER TABLE public.video_dates ADD COLUMN IF NOT EXISTS recording_url TEXT;
ALTER TABLE public.video_dates ADD COLUMN IF NOT EXISTS recording_started_at TIMESTAMPTZ;
-- Migration: Add video date call fields for Daily.co integration
-- Description: Adds columns for room tokens, join tracking, and refund handling

-- Add missing columns for video date functionality
ALTER TABLE video_dates 
ADD COLUMN IF NOT EXISTS daily_room_name TEXT,
ADD COLUMN IF NOT EXISTS seeker_meeting_token TEXT,
ADD COLUMN IF NOT EXISTS earner_meeting_token TEXT,
ADD COLUMN IF NOT EXISTS seeker_joined_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS earner_joined_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS scheduled_end_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS refunded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

-- Update scheduled_end_at based on existing data
UPDATE video_dates 
SET scheduled_end_at = scheduled_start + (scheduled_duration || ' minutes')::interval
WHERE scheduled_end_at IS NULL AND scheduled_start IS NOT NULL;

-- Create trigger to auto-calculate scheduled_end_at on insert/update
CREATE OR REPLACE FUNCTION calculate_scheduled_end_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.scheduled_start IS NOT NULL AND NEW.scheduled_duration IS NOT NULL THEN
    NEW.scheduled_end_at := NEW.scheduled_start + (NEW.scheduled_duration || ' minutes')::interval;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_scheduled_end_at ON video_dates;
CREATE TRIGGER set_scheduled_end_at
  BEFORE INSERT OR UPDATE OF scheduled_start, scheduled_duration ON video_dates
  FOR EACH ROW
  EXECUTE FUNCTION calculate_scheduled_end_at();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_video_dates_status ON video_dates(status);
CREATE INDEX IF NOT EXISTS idx_video_dates_scheduled_start ON video_dates(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_video_dates_seeker_id ON video_dates(seeker_id);
CREATE INDEX IF NOT EXISTS idx_video_dates_earner_id ON video_dates(earner_id);

-- Enable realtime for video_dates table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'video_dates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE video_dates;
  END IF;
END $$;

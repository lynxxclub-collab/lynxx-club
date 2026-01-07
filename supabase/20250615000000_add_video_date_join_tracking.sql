-- Migration: Add video date join tracking fields
-- Only adds fields that don't already exist

ALTER TABLE video_dates 
ADD COLUMN IF NOT EXISTS daily_room_name TEXT,
ADD COLUMN IF NOT EXISTS seeker_joined_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS earner_joined_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS scheduled_end_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS refunded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

-- Update scheduled_end_at based on existing data
UPDATE video_dates 
SET scheduled_end_at = scheduled_start + (scheduled_duration || ' minutes')::interval
WHERE scheduled_end_at IS NULL AND scheduled_start IS NOT NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_video_dates_scheduled_start ON video_dates(scheduled_start);

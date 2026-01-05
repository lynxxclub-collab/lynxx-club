-- Migration: 20260104_01_add_video_call_tokens_and_tracking
-- Description: Adds columns for Daily.co meeting tokens and actual call start time

-- Add seeker_token column to store Daily.co meeting token for the seeker
ALTER TABLE video_dates
ADD COLUMN IF NOT EXISTS seeker_token TEXT;

-- Add earner_token column to store Daily.co meeting token for the earner
ALTER TABLE video_dates
ADD COLUMN IF NOT EXISTS earner_token TEXT;

-- Add actual_start column to track when the call actually started (vs scheduled_start)
ALTER TABLE video_dates
ADD COLUMN IF NOT EXISTS actual_start TIMESTAMPTZ;

-- Add room_name column if it doesn't exist (for tracking Daily.co room name)
ALTER TABLE video_dates
ADD COLUMN IF NOT EXISTS room_name TEXT;

-- Add comment to document the purpose of these columns
COMMENT ON COLUMN video_dates.seeker_token IS 'Daily.co meeting token for the seeker participant';
COMMENT ON COLUMN video_dates.earner_token IS 'Daily.co meeting token for the earner participant';
COMMENT ON COLUMN video_dates.actual_start IS 'Actual timestamp when both participants joined and call started';
COMMENT ON COLUMN video_dates.room_name IS 'Daily.co room name for this video date';
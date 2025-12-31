-- Add call type and per-minute rate snapshotting to video_dates
ALTER TABLE video_dates 
ADD COLUMN IF NOT EXISTS call_type TEXT NOT NULL DEFAULT 'video' 
CHECK (call_type IN ('audio', 'video'));

ALTER TABLE video_dates 
ADD COLUMN IF NOT EXISTS credits_per_minute NUMERIC(10,4);

-- Backfill existing records with calculated per-minute rate
UPDATE video_dates 
SET credits_per_minute = credits_reserved::NUMERIC / scheduled_duration
WHERE credits_per_minute IS NULL AND scheduled_duration > 0;

-- Set a default for any edge cases
UPDATE video_dates 
SET credits_per_minute = 0
WHERE credits_per_minute IS NULL;

-- Create index for call_type queries
CREATE INDEX IF NOT EXISTS idx_video_dates_call_type ON video_dates(call_type);
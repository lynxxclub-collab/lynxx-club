-- Add missing columns for video date functionality
ALTER TABLE video_dates 
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS scheduled_end_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS daily_room_name TEXT,
ADD COLUMN IF NOT EXISTS seeker_joined_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS earner_joined_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS refunded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS credits_amount INTEGER;

-- Create index for faster lookups on status and scheduled time
CREATE INDEX IF NOT EXISTS idx_video_dates_status ON video_dates(status);
CREATE INDEX IF NOT EXISTS idx_video_dates_scheduled_at ON video_dates(scheduled_at);

-- Enable realtime for video_dates table if not already enabled
ALTER PUBLICATION supabase_realtime ADD TABLE video_dates;

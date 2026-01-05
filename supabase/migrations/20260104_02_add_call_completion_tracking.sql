-- Migration: 20260104_02_add_call_completion_tracking
-- Description: Adds fields to prevent charging for failed/incomplete calls

-- Add actual_end column to track when the call actually ended
ALTER TABLE video_dates
ADD COLUMN IF NOT EXISTS actual_end TIMESTAMPTZ;

-- Add actual_duration column to track actual minutes used (for proration)
ALTER TABLE video_dates
ADD COLUMN IF NOT EXISTS actual_duration INTEGER DEFAULT 0;

-- Add call_connected column to track if call was successfully established
ALTER TABLE video_dates
ADD COLUMN IF NOT EXISTS call_connected BOOLEAN DEFAULT false;

-- Add both_joined column to track if both participants joined
ALTER TABLE video_dates
ADD COLUMN IF NOT EXISTS both_joined BOOLEAN DEFAULT false;

-- Add completion_verified column to prevent double-charging
ALTER TABLE video_dates
ADD COLUMN IF NOT EXISTS completion_verified BOOLEAN DEFAULT false;

-- Add failure_reason column to track why calls failed
ALTER TABLE video_dates
ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- Add comments
COMMENT ON COLUMN video_dates.actual_end IS 'Timestamp when the call actually ended';
COMMENT ON COLUMN video_dates.actual_duration IS 'Actual duration in minutes that the call lasted';
COMMENT ON COLUMN video_dates.call_connected IS 'Whether the Daily.co call was successfully established';
COMMENT ON COLUMN video_dates.both_joined IS 'Whether both participants joined the call';
COMMENT ON COLUMN video_dates.completion_verified IS 'Whether completion has been processed (prevents double-charging)';
COMMENT ON COLUMN video_dates.failure_reason IS 'Reason why the call failed (if applicable)';

-- Create index for faster queries on completion status
CREATE INDEX IF NOT EXISTS idx_video_dates_completion_verified 
ON video_dates(completion_verified, status);

-- Create index for querying by actual times
CREATE INDEX IF NOT EXISTS idx_video_dates_actual_times 
ON video_dates(actual_start, actual_end) 
WHERE actual_start IS NOT NULL;
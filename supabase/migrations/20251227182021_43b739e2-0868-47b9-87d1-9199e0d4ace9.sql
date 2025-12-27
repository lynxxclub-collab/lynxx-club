-- Drop the old constraint that only allowed 30 and 60
ALTER TABLE video_dates DROP CONSTRAINT IF EXISTS video_dates_scheduled_duration_check;

-- Add the updated constraint with all valid durations (15, 30, 60, 90)
ALTER TABLE video_dates ADD CONSTRAINT video_dates_scheduled_duration_check 
  CHECK (scheduled_duration = ANY (ARRAY[15, 30, 60, 90]));
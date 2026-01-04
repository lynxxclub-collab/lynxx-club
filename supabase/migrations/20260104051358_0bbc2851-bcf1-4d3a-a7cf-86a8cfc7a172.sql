-- Update default values for video rate columns
ALTER TABLE profiles
  ALTER COLUMN video_15min_rate SET DEFAULT 200,
  ALTER COLUMN video_30min_rate SET DEFAULT 300,
  ALTER COLUMN video_60min_rate SET DEFAULT 500,
  ALTER COLUMN video_90min_rate SET DEFAULT 700;
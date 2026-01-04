-- Update default values for video rate columns (credits)
ALTER TABLE public.profiles
  ALTER COLUMN video_15min_rate SET DEFAULT 200,
  ALTER COLUMN video_30min_rate SET DEFAULT 280,
  ALTER COLUMN video_60min_rate SET DEFAULT 392,
  ALTER COLUMN video_90min_rate SET DEFAULT 412;

-- Optional: backfill existing rows that are NULL (recommended)
UPDATE public.profiles
SET
  video_15min_rate = COALESCE(video_15min_rate, 200),
  video_30min_rate = COALESCE(video_30min_rate, 280),
  video_60min_rate = COALESCE(video_60min_rate, 392),
  video_90min_rate = COALESCE(video_90min_rate, 412)
WHERE
  video_15min_rate IS NULL
  OR video_30min_rate IS NULL
  OR video_60min_rate IS NULL
  OR video_90min_rate IS NULL;
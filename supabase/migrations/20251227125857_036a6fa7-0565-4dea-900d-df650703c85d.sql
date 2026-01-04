-- Align video rate defaults with UI slider minimums

ALTER TABLE public.profiles
  ALTER COLUMN video_15min_rate SET DEFAULT 200,
  ALTER COLUMN video_30min_rate SET DEFAULT 280,
  ALTER COLUMN video_60min_rate SET DEFAULT 392,
  ALTER COLUMN video_90min_rate SET DEFAULT 412;
-- Align video rates with messaging rates: 5 credits per minute
-- New rates: 15min=75, 30min=150, 60min=300, 90min=450

ALTER TABLE public.profiles 
  ALTER COLUMN video_15min_rate SET DEFAULT 75,
  ALTER COLUMN video_30min_rate SET DEFAULT 150,
  ALTER COLUMN video_60min_rate SET DEFAULT 300,
  ALTER COLUMN video_90min_rate SET DEFAULT 450;
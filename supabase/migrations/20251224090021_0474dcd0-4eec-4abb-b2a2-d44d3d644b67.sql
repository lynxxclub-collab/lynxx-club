-- Add new video rate columns for 15-minute and 90-minute calls
ALTER TABLE public.profiles
ADD COLUMN video_15min_rate integer DEFAULT 150,
ADD COLUMN video_90min_rate integer DEFAULT 700;
-- Add daily_room_url column to video_dates table
ALTER TABLE public.video_dates 
ADD COLUMN daily_room_url TEXT;
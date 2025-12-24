-- Add video_date_id column to ratings table
ALTER TABLE public.ratings ADD COLUMN video_date_id uuid REFERENCES public.video_dates(id);

-- Add unique constraint to prevent double ratings
ALTER TABLE public.ratings ADD CONSTRAINT unique_video_date_rating UNIQUE (rater_id, video_date_id);
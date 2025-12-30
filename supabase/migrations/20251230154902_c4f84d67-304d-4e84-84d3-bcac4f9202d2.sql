-- Add activity_score column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS activity_score integer DEFAULT 0;

-- Create index for efficient sorting
CREATE INDEX IF NOT EXISTS idx_profiles_activity_score ON public.profiles(activity_score DESC NULLS LAST);
-- Add reactivation columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS reactivation_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reactivated_at TIMESTAMPTZ;
-- Step 1: Add new profile fields first
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS height text,
ADD COLUMN IF NOT EXISTS hobbies text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}';
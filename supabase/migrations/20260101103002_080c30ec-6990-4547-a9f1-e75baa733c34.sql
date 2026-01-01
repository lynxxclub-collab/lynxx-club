-- Add lifestyle and preference columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS relationship_status text,
ADD COLUMN IF NOT EXISTS education text,
ADD COLUMN IF NOT EXISTS occupation text,
ADD COLUMN IF NOT EXISTS languages text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS smoking text,
ADD COLUMN IF NOT EXISTS drinking text,
ADD COLUMN IF NOT EXISTS fitness_level text,
ADD COLUMN IF NOT EXISTS looking_for text,
ADD COLUMN IF NOT EXISTS favorite_food text,
ADD COLUMN IF NOT EXISTS favorite_music text,
ADD COLUMN IF NOT EXISTS favorite_movies text,
ADD COLUMN IF NOT EXISTS values_beliefs text,
ADD COLUMN IF NOT EXISTS personality_traits text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS fun_facts text[] DEFAULT '{}';
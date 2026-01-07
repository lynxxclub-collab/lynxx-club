-- ============================================
-- MIGRATION: add_extended_profile_fields.sql
-- DESCRIPTION: Adds support for arrays (photos, hobbies)
--              and extended location info to profiles.
-- ============================================

-- 1. Add extended location fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS location_state TEXT;

-- 2. Add physical attribute fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS height TEXT;

-- 3. Add array fields for personality
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS hobbies TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}';

-- 4. Update profile_photo to profile_photos (Array support)
-- First, rename the old column to a backup
ALTER TABLE public.profiles RENAME COLUMN profile_photo TO profile_photo_old;

-- Add the new array column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_photos TEXT[] DEFAULT '{}';

-- 5. Update RLS Policies (Ensure users can update these new fields)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

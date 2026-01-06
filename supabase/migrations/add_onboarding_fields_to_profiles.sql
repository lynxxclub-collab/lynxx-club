-- ============================================
-- MIGRATION: add_onboarding_fields_to_profiles.sql
-- DESCRIPTION: Adds fields required for the Basic Info
--              onboarding step to the profiles table.
-- ============================================

-- 1. Add onboarding specific columns
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS gender TEXT, -- 'male', 'female', 'non_binary', 'other'
ADD COLUMN IF NOT EXISTS gender_preference TEXT[], -- Array of preferred genders
ADD COLUMN IF NOT EXISTS onboarding_step INT DEFAULT 1; -- Tracks progress (1, 2, 3, 4)

-- 2. Add Constraints
ALTER TABLE public.profiles
ADD CONSTRAINT check_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100);

ALTER TABLE public.profiles
ADD CONSTRAINT check_gender CHECK (gender IN ('male', 'female', 'non_binary', 'other', NULL));

-- 3. Create Index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_step ON public.profiles(onboarding_step);

-- 4. Update RLS Policies
-- Ensure users can update their own profile (standard practice, but confirming)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);
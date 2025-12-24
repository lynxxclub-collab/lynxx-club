-- Fix: Restrict cross-user profile access to prevent sensitive data exposure
-- The browse policies expose all columns. We need to restrict cross-user access
-- to use the profiles_browse view, while keeping full access for own profile and admins.

-- Step 1: Drop the browse policies that expose all columns
DROP POLICY IF EXISTS "Seekers can browse verified earners" ON public.profiles;
DROP POLICY IF EXISTS "Earners can browse verified seekers" ON public.profiles;

-- Step 2: Create a secure function to check if user can browse profiles
CREATE OR REPLACE FUNCTION public.is_own_profile(_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() = _profile_id
$$;

-- Step 3: The remaining policies on profiles table are:
-- "Users can view their own profile" - users see their own full data (already exists)
-- "Admins can view all profiles" - admins can manage users (already exists)
-- "Users can insert their own profile" - for registration (already exists)
-- "Users can update their own profile" - for profile editing (already exists)

-- Step 4: Create RLS policies on profiles_browse view for cross-user browsing
-- Note: Views inherit RLS from their base tables when security_invoker = on
-- Since we removed the cross-user SELECT policies, we need to grant access differently

-- Drop the view and recreate it with SECURITY DEFINER to bypass base table RLS
DROP VIEW IF EXISTS public.profiles_browse;

CREATE VIEW public.profiles_browse 
WITH (security_barrier = true)
AS
SELECT 
  id,
  name,
  date_of_birth,
  gender,
  gender_preference,
  location_city,
  location_state,
  bio,
  profile_photos,
  user_type,
  video_15min_rate,
  video_30min_rate,
  video_60min_rate,
  video_90min_rate,
  average_rating,
  total_ratings,
  created_at,
  verification_status,
  account_status,
  is_featured,
  featured_until
FROM public.profiles
WHERE verification_status = 'verified' 
  AND account_status = 'active';

-- Grant access to authenticated users
GRANT SELECT ON public.profiles_browse TO authenticated;

-- Create a secure function for browsing that bypasses RLS
CREATE OR REPLACE FUNCTION public.get_browse_profiles(
  p_target_user_type text,
  p_viewer_user_type text
)
RETURNS TABLE (
  id uuid,
  name text,
  date_of_birth date,
  gender public.gender,
  gender_preference public.gender[],
  location_city text,
  location_state text,
  bio text,
  profile_photos text[],
  user_type public.user_type,
  video_15min_rate integer,
  video_30min_rate integer,
  video_60min_rate integer,
  video_90min_rate integer,
  average_rating numeric,
  total_ratings integer,
  created_at timestamptz,
  verification_status text,
  account_status text,
  is_featured boolean,
  featured_until timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.name,
    p.date_of_birth,
    p.gender,
    p.gender_preference,
    p.location_city,
    p.location_state,
    p.bio,
    p.profile_photos,
    p.user_type,
    p.video_15min_rate,
    p.video_30min_rate,
    p.video_60min_rate,
    p.video_90min_rate,
    p.average_rating,
    p.total_ratings,
    p.created_at,
    p.verification_status,
    p.account_status,
    p.is_featured,
    p.featured_until
  FROM public.profiles p
  WHERE p.user_type::text = p_target_user_type
    AND p.verification_status = 'verified'
    AND p.account_status = 'active'
    -- Verify caller is a verified user of the correct type
    AND EXISTS (
      SELECT 1 FROM public.profiles viewer
      WHERE viewer.id = auth.uid()
      AND viewer.user_type::text = p_viewer_user_type
      AND viewer.verification_status = 'verified'
    )
$$;
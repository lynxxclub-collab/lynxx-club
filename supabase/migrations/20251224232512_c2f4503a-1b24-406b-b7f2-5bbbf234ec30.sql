-- Fix profiles_browse security: Drop view and recreate with proper RLS enforcement
-- The view currently has no RLS protection

-- Drop existing view
DROP VIEW IF EXISTS public.profiles_browse;

-- Recreate view as a proper view with SECURITY INVOKER (requires caller's permissions)
-- This view ONLY contains safe public fields - no email, no sensitive docs
CREATE VIEW public.profiles_browse
WITH (security_invoker = on)
AS
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
WHERE p.verification_status = 'verified' 
  AND p.account_status = 'active';

-- Grant SELECT to authenticated users only (NOT anon/public)
REVOKE ALL ON public.profiles_browse FROM anon;
REVOKE ALL ON public.profiles_browse FROM public;
GRANT SELECT ON public.profiles_browse TO authenticated;

-- Ensure the underlying profiles table has proper RLS policies
-- The view will inherit RLS from profiles table via SECURITY INVOKER

-- Add policy for verified users to see other verified users in browse context
-- First drop if exists to avoid duplicates
DROP POLICY IF EXISTS "Verified users can browse other verified profiles" ON public.profiles;

-- Create a secure browse policy that allows authenticated verified users 
-- to see only verified active profiles (opposite user type for dating)
CREATE POLICY "Verified users can browse other verified profiles" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can always see their own profile
  auth.uid() = id
  OR (
    -- Only verified users can browse
    EXISTS (
      SELECT 1 FROM public.profiles viewer 
      WHERE viewer.id = auth.uid() 
      AND viewer.verification_status = 'verified'
    )
    -- And they can only see verified active profiles of opposite type
    AND verification_status = 'verified' 
    AND account_status = 'active'
    AND (
      -- Seekers see earners, earners see seekers
      (user_type = 'earner' AND EXISTS (
        SELECT 1 FROM public.profiles v WHERE v.id = auth.uid() AND v.user_type = 'seeker'
      ))
      OR
      (user_type = 'seeker' AND EXISTS (
        SELECT 1 FROM public.profiles v WHERE v.id = auth.uid() AND v.user_type = 'earner'
      ))
    )
  )
);
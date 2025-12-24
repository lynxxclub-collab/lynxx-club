-- Fix the SECURITY DEFINER view warning by using SECURITY INVOKER
-- The view should use the caller's permissions, and we'll use the RPC function for browsing

-- Drop the SECURITY DEFINER view
DROP VIEW IF EXISTS public.profiles_browse;

-- Recreate with SECURITY INVOKER (default) - this is just a fallback, main browsing uses RPC
CREATE VIEW public.profiles_browse AS
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

-- Use security_invoker to enforce caller's RLS
ALTER VIEW public.profiles_browse SET (security_invoker = on);

-- Grant access
GRANT SELECT ON public.profiles_browse TO authenticated;
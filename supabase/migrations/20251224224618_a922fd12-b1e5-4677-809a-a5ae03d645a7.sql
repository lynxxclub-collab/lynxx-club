-- Create a secure view for public profile browsing
-- This view only exposes fields that are safe for cross-user viewing

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
FROM public.profiles;

-- Enable RLS on the view (security_invoker makes the view use the caller's permissions)
ALTER VIEW public.profiles_browse SET (security_invoker = on);

-- Grant access to authenticated users
GRANT SELECT ON public.profiles_browse TO authenticated;

-- Now restrict the main profiles table to only allow users to see their own full profile
-- First drop the cross-type policies that expose all columns
DROP POLICY IF EXISTS "Seekers can only view verified Earners" ON public.profiles;
DROP POLICY IF EXISTS "Earners can view verified Seekers" ON public.profiles;

-- The remaining policies on profiles are:
-- "Users can view their own profile" - users see their own full data
-- "Admins can view all profiles" - admins can manage users
-- "Users can insert their own profile" - for registration
-- "Users can update their own profile" - for profile editing
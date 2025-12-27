-- Create a public browse function that doesn't require authentication
-- Returns only safe profile fields for public viewing

CREATE OR REPLACE FUNCTION public.get_public_browse_profiles()
RETURNS TABLE(
  id uuid,
  name text,
  date_of_birth date,
  gender gender,
  location_city text,
  location_state text,
  bio text,
  profile_photos text[],
  user_type user_type,
  video_15min_rate integer,
  video_30min_rate integer,
  video_60min_rate integer,
  video_90min_rate integer,
  average_rating numeric,
  total_ratings integer,
  created_at timestamp with time zone,
  is_featured boolean,
  featured_until timestamp with time zone,
  height text,
  hobbies text[],
  interests text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.id,
    p.name,
    p.date_of_birth,
    p.gender,
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
    p.is_featured,
    p.featured_until,
    p.height,
    p.hobbies,
    p.interests
  FROM public.profiles p
  WHERE p.account_status = 'active'
    AND p.verification_status = 'verified'
    AND p.name IS NOT NULL
    AND array_length(p.profile_photos, 1) > 0
  ORDER BY p.is_featured DESC, p.average_rating DESC NULLS LAST, p.created_at DESC;
$$;

-- Grant execute permission to anonymous users (no auth required)
GRANT EXECUTE ON FUNCTION public.get_public_browse_profiles() TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_browse_profiles() TO authenticated;
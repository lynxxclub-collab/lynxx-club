-- Drop function first to allow changing return type
DROP FUNCTION IF EXISTS public.get_browse_profiles(text, text);

-- Drop and recreate the view to include new fields
DROP VIEW IF EXISTS public.profiles_browse;

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
  featured_until,
  height,
  hobbies,
  interests
FROM public.profiles
WHERE verification_status = 'verified' AND account_status = 'active';

-- Create the function with new fields
CREATE FUNCTION public.get_browse_profiles(p_target_user_type text, p_viewer_user_type text)
RETURNS TABLE(
  id uuid,
  name text,
  date_of_birth date,
  gender gender,
  gender_preference gender[],
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
  verification_status text,
  account_status text,
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
    p.featured_until,
    p.height,
    p.hobbies,
    p.interests
  FROM public.profiles p
  WHERE p.user_type::text = p_target_user_type
    AND p.verification_status = 'verified'
    AND p.account_status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.profiles viewer
      WHERE viewer.id = auth.uid()
      AND viewer.user_type::text = p_viewer_user_type
      AND viewer.verification_status = 'verified'
    )
$$;
-- Drop the existing function first then recreate with new return type
DROP FUNCTION IF EXISTS get_public_profile_by_id(uuid);

-- Recreate with leaderboard settings included
CREATE FUNCTION get_public_profile_by_id(profile_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  age INTEGER,
  gender TEXT,
  location_city TEXT,
  location_state TEXT,
  bio TEXT,
  profile_photos TEXT[],
  user_type TEXT,
  video_15min_rate INTEGER,
  video_30min_rate INTEGER,
  video_60min_rate INTEGER,
  video_90min_rate INTEGER,
  average_rating NUMERIC,
  total_ratings INTEGER,
  created_at TIMESTAMPTZ,
  height TEXT,
  hobbies TEXT[],
  interests TEXT[],
  leaderboard_enabled BOOLEAN,
  show_daily_leaderboard BOOLEAN
)
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.name,
    EXTRACT(YEAR FROM AGE(p.date_of_birth))::integer as age,
    p.gender::text,
    p.location_city,
    p.location_state,
    p.bio,
    p.profile_photos,
    p.user_type::text,
    p.video_15min_rate,
    p.video_30min_rate,
    p.video_60min_rate,
    p.video_90min_rate,
    p.average_rating,
    p.total_ratings,
    p.created_at,
    p.height,
    p.hobbies,
    p.interests,
    COALESCE(p.leaderboard_enabled, true) as leaderboard_enabled,
    COALESCE(p.show_daily_leaderboard, true) as show_daily_leaderboard
  FROM public.profiles p
  WHERE p.id = profile_id
    AND p.account_status = 'active'
    AND p.verification_status = 'verified'
    AND p.name IS NOT NULL
    AND array_length(p.profile_photos, 1) > 0;
$$ LANGUAGE sql STABLE;
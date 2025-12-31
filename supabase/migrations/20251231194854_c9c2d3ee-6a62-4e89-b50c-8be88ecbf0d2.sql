-- Fix get_public_profile_by_id to not reference non-existent columns
-- and to allow authenticated seekers + earners to view each other's active profiles.

CREATE OR REPLACE FUNCTION public.get_public_profile_by_id(profile_id uuid)
RETURNS TABLE(
  id uuid, name text, age integer, gender text, location_city text, location_state text,
  bio text, profile_photos text[], user_type text, video_15min_rate integer,
  video_30min_rate integer, video_60min_rate integer, video_90min_rate integer,
  average_rating numeric, total_ratings integer, height text, hobbies text[],
  interests text[], created_at timestamp with time zone, leaderboard_enabled boolean,
  show_daily_leaderboard boolean, personality_traits text[], relationship_status text,
  languages text[], education text, occupation text, favorite_food text,
  favorite_music text, favorite_movies text, looking_for text, fun_facts text[],
  smoking text, drinking text, fitness_level text, values_beliefs text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    EXTRACT(YEAR FROM age(p.date_of_birth))::integer as age,
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
    p.height,
    p.hobbies,
    p.interests,
    p.created_at,
    COALESCE(p.leaderboard_enabled, true) as leaderboard_enabled,
    COALESCE(p.show_daily_leaderboard, true) as show_daily_leaderboard,

    -- The columns below are not present in the current profiles table.
    -- Return NULLs to keep the API stable for the frontend.
    NULL::text[] as personality_traits,
    NULL::text as relationship_status,
    NULL::text[] as languages,
    NULL::text as education,
    NULL::text as occupation,
    NULL::text as favorite_food,
    NULL::text as favorite_music,
    NULL::text as favorite_movies,
    NULL::text as looking_for,
    NULL::text[] as fun_facts,
    NULL::text as smoking,
    NULL::text as drinking,
    NULL::text as fitness_level,
    NULL::text as values_beliefs
  FROM public.profiles p
  WHERE p.id = profile_id
    AND (
      -- Admins can view any profile
      public.has_role(auth.uid(), 'admin')
      -- Users can always view their own profile
      OR p.id = auth.uid()
      -- Authenticated users can view active profiles (seeker <-> earner)
      OR (auth.uid() IS NOT NULL AND p.account_status = 'active')
    );
END;
$$;

-- Ensure execute permission remains correct
GRANT EXECUTE ON FUNCTION public.get_public_profile_by_id(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_public_profile_by_id(uuid) FROM anon;
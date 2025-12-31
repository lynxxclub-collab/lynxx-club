-- Re-grant execute permissions for get_public_profile_by_id function
GRANT EXECUTE ON FUNCTION public.get_public_profile_by_id(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_public_profile_by_id(uuid) FROM anon;

-- Update function to allow admins to view any profile
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
    p.id, p.name,
    EXTRACT(YEAR FROM age(p.date_of_birth))::integer as age,
    p.gender::text, p.location_city, p.location_state, p.bio, p.profile_photos,
    p.user_type::text, p.video_15min_rate, p.video_30min_rate, p.video_60min_rate,
    p.video_90min_rate, p.average_rating, p.total_ratings, p.height, p.hobbies,
    p.interests, p.created_at,
    COALESCE(p.leaderboard_enabled, true) as leaderboard_enabled,
    COALESCE(p.show_daily_leaderboard, true) as show_daily_leaderboard,
    p.personality_traits, p.relationship_status, p.languages, p.education,
    p.occupation, p.favorite_food, p.favorite_music, p.favorite_movies,
    p.looking_for, p.fun_facts, p.smoking, p.drinking, p.fitness_level, p.values_beliefs
  FROM profiles p
  WHERE p.id = profile_id
    AND (
      -- Allow if profile is active and verified
      (p.verification_status = 'verified' AND p.account_status = 'active')
      -- OR allow if caller is admin
      OR public.has_role(auth.uid(), 'admin')
      -- OR allow if caller is viewing their own profile
      OR p.id = auth.uid()
    );
END;
$$;
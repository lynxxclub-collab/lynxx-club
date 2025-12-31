-- Update get_public_profile_by_id to allow profiles without photos
-- The UI can show a placeholder if no photos exist
CREATE OR REPLACE FUNCTION public.get_public_profile_by_id(profile_id uuid)
 RETURNS TABLE(id uuid, name text, age integer, gender text, location_city text, location_state text, bio text, profile_photos text[], user_type text, video_15min_rate integer, video_30min_rate integer, video_60min_rate integer, video_90min_rate integer, average_rating numeric, total_ratings integer, created_at timestamp with time zone, height text, hobbies text[], interests text[], leaderboard_enabled boolean, show_daily_leaderboard boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    AND p.name IS NOT NULL;
$function$;
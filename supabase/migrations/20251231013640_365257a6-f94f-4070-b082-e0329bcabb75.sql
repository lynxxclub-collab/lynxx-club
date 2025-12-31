-- CRITICAL SECURITY FIX: Remove overly permissive RLS policy on profiles table
-- This policy was allowing ANY authenticated user to view ALL verified profiles with complete PII

-- 1. Drop the dangerous policy that exposes entire user database
DROP POLICY IF EXISTS "Authenticated users can view active verified profiles" ON public.profiles;

-- 2. Fix browse functions to return age instead of date_of_birth

-- Fix get_browse_profiles function
CREATE OR REPLACE FUNCTION public.get_browse_profiles(p_target_user_type text, p_viewer_user_type text)
 RETURNS TABLE(id uuid, name text, age integer, gender gender, gender_preference gender[], location_city text, location_state text, bio text, profile_photos text[], user_type user_type, video_15min_rate integer, video_30min_rate integer, video_60min_rate integer, video_90min_rate integer, average_rating numeric, total_ratings integer, created_at timestamp with time zone, verification_status text, account_status text, is_featured boolean, featured_until timestamp with time zone, height text, hobbies text[], interests text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    p.id,
    p.name,
    EXTRACT(YEAR FROM AGE(p.date_of_birth))::integer as age,
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
$function$;

-- Fix get_browse_profiles_all function
CREATE OR REPLACE FUNCTION public.get_browse_profiles_all()
 RETURNS TABLE(id uuid, name text, age integer, gender gender, gender_preference gender[], location_city text, location_state text, bio text, profile_photos text[], user_type user_type, video_15min_rate integer, video_30min_rate integer, video_60min_rate integer, video_90min_rate integer, average_rating numeric, total_ratings integer, created_at timestamp with time zone, verification_status text, account_status text, is_featured boolean, featured_until timestamp with time zone, height text, hobbies text[], interests text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    p.id,
    p.name,
    EXTRACT(YEAR FROM AGE(p.date_of_birth))::integer as age,
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
  WHERE p.account_status = 'active'
    AND p.id <> auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.blocked_users b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p.id)
         OR (b.blocked_id = auth.uid() AND b.blocker_id = p.id)
    )
$function$;

-- Fix get_public_profile_by_id function
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
    AND p.name IS NOT NULL
    AND array_length(p.profile_photos, 1) > 0;
$function$;
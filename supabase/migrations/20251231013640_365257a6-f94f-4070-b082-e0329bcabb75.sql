/* ============================================================================
   CRITICAL SECURITY FIX + BROWSE FUNCTION FIXES (COPY/PASTE)
   - Removes overly-permissive profiles SELECT policy
   - Browse/Public functions return AGE (not DOB)
   - Allows profiles with NO photos to be returned (UI shows placeholder)
   - Restricts function execution to authenticated
   ============================================================================ */

-- 1) Drop the dangerous policy (if it exists)
DROP POLICY IF EXISTS "Authenticated users can view active verified profiles" ON public.profiles;

-- IMPORTANT:
-- Do NOT drop your other profiles policies (own profile read/update/insert).
-- This migration ONLY removes the broad "view everyone" policy.


/* --------------------------------------------------------------------------
   2) Replace functions safely
   NOTE: If you ever changed RETURNS TABLE shape previously, Postgres may throw:
   "cannot change return type of existing function"
   So we DROP the functions first, then recreate.
   -------------------------------------------------------------------------- */

-- Drop old versions (safe)
DROP FUNCTION IF EXISTS public.get_browse_profiles(text, text);
DROP FUNCTION IF EXISTS public.get_browse_profiles_all();
DROP FUNCTION IF EXISTS public.get_public_profile_by_id(uuid);


-- 2A) get_browse_profiles (target user type + checks viewer is verified + correct type)
CREATE FUNCTION public.get_browse_profiles(
  p_target_user_type text,
  p_viewer_user_type text
)
RETURNS TABLE(
  id uuid,
  name text,
  age integer,
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
    EXTRACT(YEAR FROM AGE(p.date_of_birth))::integer AS age,
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
    p.verification_status::text,
    p.account_status::text,
    p.is_featured,
    p.featured_until,
    p.height,
    p.hobbies,
    p.interests
  FROM public.profiles p
  WHERE p.user_type::text = p_target_user_type
    AND p.verification_status = 'verified'
    AND p.account_status = 'active'
    AND p.id <> auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.profiles viewer
      WHERE viewer.id = auth.uid()
        AND viewer.user_type::text = p_viewer_user_type
        AND viewer.verification_status = 'verified'
        AND viewer.account_status = 'active'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.blocked_users b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p.id)
         OR (b.blocked_id = auth.uid() AND b.blocker_id = p.id)
    );
$$;


-- 2B) get_browse_profiles_all (viewer must be verified+active, excludes blocked, excludes self)
CREATE FUNCTION public.get_browse_profiles_all()
RETURNS TABLE(
  id uuid,
  name text,
  age integer,
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
    EXTRACT(YEAR FROM AGE(p.date_of_birth))::integer AS age,
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
    p.verification_status::text,
    p.account_status::text,
    p.is_featured,
    p.featured_until,
    p.height,
    p.hobbies,
    p.interests
  FROM public.profiles p
  WHERE p.account_status = 'active'
    AND p.verification_status = 'verified'
    AND p.id <> auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.profiles viewer
      WHERE viewer.id = auth.uid()
        AND viewer.verification_status = 'verified'
        AND viewer.account_status = 'active'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.blocked_users b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p.id)
         OR (b.blocked_id = auth.uid() AND b.blocker_id = p.id)
    );
$$;


-- 2C) get_public_profile_by_id (ALLOW profiles without photos!)
CREATE FUNCTION public.get_public_profile_by_id(profile_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  age integer,
  gender text,
  location_city text,
  location_state text,
  bio text,
  profile_photos text[],
  user_type text,
  video_15min_rate integer,
  video_30min_rate integer,
  video_60min_rate integer,
  video_90min_rate integer,
  average_rating numeric,
  total_ratings integer,
  created_at timestamp with time zone,
  height text,
  hobbies text[],
  interests text[],
  leaderboard_enabled boolean,
  show_daily_leaderboard boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.id,
    p.name,
    EXTRACT(YEAR FROM AGE(p.date_of_birth))::integer AS age,
    p.gender::text,
    p.location_city,
    p.location_state,
    p.bio,
    p.profile_photos,                -- may be NULL or empty array, UI shows placeholder
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
    COALESCE(p.leaderboard_enabled, true) AS leaderboard_enabled,
    COALESCE(p.show_daily_leaderboard, true) AS show_daily_leaderboard
  FROM public.profiles p
  WHERE p.id = profile_id
    AND p.account_status = 'active'
    AND p.verification_status = 'verified'
    AND p.name IS NOT NULL;
$$;


-- 3) Permissions: authenticated only
REVOKE ALL ON FUNCTION public.get_browse_profiles(text, text) FROM anon;
REVOKE ALL ON FUNCTION public.get_browse_profiles_all() FROM anon;
REVOKE ALL ON FUNCTION public.get_public_profile_by_id(uuid) FROM anon;

GRANT EXECUTE ON FUNCTION public.get_browse_profiles(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_browse_profiles_all() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_by_id(uuid) TO authenticated;
/* ============================================================================
   BROWSE FUNCTIONS: DOB -> AGE + Viewer gating + Safe drops + Permissions
   ============================================================================ */

-- ----------------------------------------------------------------------------
-- 0) Drop functions safely (handles arg/signature mismatches)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_browse_profiles(text, text);
DROP FUNCTION IF EXISTS public.get_browse_profiles_all();
DROP FUNCTION IF EXISTS public.get_browse_profiles_for_viewer();

-- ----------------------------------------------------------------------------
-- 1) get_browse_profiles (target type + viewer gating + exclude self + blocklist)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 2) get_browse_profiles_all (viewer must be verified+active + exclude self + blocklist)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 3) get_browse_profiles_for_viewer (prioritized list; viewer gating enforced)
-- ----------------------------------------------------------------------------
CREATE FUNCTION public.get_browse_profiles_for_viewer()
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
  interests text[],
  activity_score integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_viewer_type user_type;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Viewer must exist and be eligible to browse
  SELECT p.user_type INTO v_viewer_type
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND p.account_status = 'active'
    AND p.verification_status = 'verified';

  IF v_viewer_type IS NULL THEN
    RAISE EXCEPTION 'Viewer not active/verified';
  END IF;

  RETURN QUERY
  WITH ranked_profiles AS (
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
      p.verification_status::text,
      p.account_status::text,
      p.is_featured,
      p.featured_until,
      p.height,
      p.hobbies,
      p.interests,
      COALESCE(p.activity_score, 0) AS activity_score,
      CASE 
        WHEN p.user_type = 'earner' 
          AND p.created_at > NOW() - INTERVAL '30 days'
        THEN 1
        ELSE 2
      END AS priority_group,
      ROW_NUMBER() OVER (
        PARTITION BY 
          CASE 
            WHEN p.user_type = 'earner' 
              AND p.created_at > NOW() - INTERVAL '30 days'
            THEN 1
            ELSE 2
          END
        ORDER BY COALESCE(p.activity_score, 0) DESC, p.created_at DESC
      ) AS group_rank
    FROM public.profiles p
    WHERE p.account_status = 'active'
      AND p.verification_status = 'verified'
      AND p.id <> auth.uid()
      AND NOT EXISTS (
        SELECT 1
        FROM public.blocked_users b
        WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p.id)
           OR (b.blocked_id = auth.uid() AND b.blocker_id = p.id)
      )
  )
  SELECT 
    rp.id,
    rp.name,
    rp.age,
    rp.gender,
    rp.gender_preference,
    rp.location_city,
    rp.location_state,
    rp.bio,
    rp.profile_photos,
    rp.user_type,
    rp.video_15min_rate,
    rp.video_30min_rate,
    rp.video_60min_rate,
    rp.video_90min_rate,
    rp.average_rating,
    rp.total_ratings,
    rp.created_at,
    rp.verification_status,
    rp.account_status,
    rp.is_featured,
    rp.featured_until,
    rp.height,
    rp.hobbies,
    rp.interests,
    rp.activity_score
  FROM ranked_profiles rp
  WHERE 
    (rp.priority_group = 1 AND rp.group_rank <= 50) OR rp.priority_group = 2
  ORDER BY 
    rp.priority_group ASC,
    CASE WHEN rp.priority_group = 1 THEN rp.activity_score END DESC NULLS LAST,
    CASE WHEN rp.priority_group = 2 THEN CASE WHEN rp.is_featured THEN 0 ELSE 1 END END ASC,
    CASE WHEN rp.priority_group = 2 THEN rp.activity_score END DESC NULLS LAST,
    rp.created_at DESC;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4) Permissions (very important for Lovable/Supabase)
-- ----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.get_browse_profiles(text, text) FROM anon;
REVOKE ALL ON FUNCTION public.get_browse_profiles_all() FROM anon;
REVOKE ALL ON FUNCTION public.get_browse_profiles_for_viewer() FROM anon;

GRANT EXECUTE ON FUNCTION public.get_browse_profiles(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_browse_profiles_all() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_browse_profiles_for_viewer() TO authenticated;
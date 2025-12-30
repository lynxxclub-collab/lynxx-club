-- Drop the existing function first to change its return type
DROP FUNCTION IF EXISTS public.get_browse_profiles_for_viewer();

-- Recreate the function with new sorting logic and activity_score column
CREATE OR REPLACE FUNCTION public.get_browse_profiles_for_viewer()
RETURNS TABLE(
  id UUID, 
  name TEXT, 
  date_of_birth DATE, 
  gender gender, 
  gender_preference gender[], 
  location_city TEXT, 
  location_state TEXT, 
  bio TEXT, 
  profile_photos TEXT[], 
  user_type user_type, 
  video_15min_rate INTEGER, 
  video_30min_rate INTEGER, 
  video_60min_rate INTEGER, 
  video_90min_rate INTEGER, 
  average_rating NUMERIC, 
  total_ratings INTEGER, 
  created_at TIMESTAMPTZ, 
  verification_status TEXT, 
  account_status TEXT, 
  is_featured BOOLEAN, 
  featured_until TIMESTAMPTZ, 
  height TEXT, 
  hobbies TEXT[], 
  interests TEXT[],
  activity_score INTEGER
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
      p.interests,
      COALESCE(p.activity_score, 0) AS activity_score,
      -- Priority: earners within 30 days of creation get priority
      CASE 
        WHEN p.user_type = 'earner' 
          AND p.created_at > NOW() - INTERVAL '30 days'
        THEN 1
        ELSE 2
      END AS priority_group,
      -- Row number within priority group for limiting first 50
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
    rp.date_of_birth,
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
    -- Include first 50 from priority group 1, all from group 2
    (rp.priority_group = 1 AND rp.group_rank <= 50) OR rp.priority_group = 2
  ORDER BY 
    rp.priority_group ASC,
    CASE WHEN rp.priority_group = 1 THEN rp.activity_score END DESC NULLS LAST,
    CASE WHEN rp.priority_group = 2 THEN 
      CASE WHEN rp.is_featured THEN 0 ELSE 1 END 
    END ASC,
    CASE WHEN rp.priority_group = 2 THEN rp.activity_score END DESC NULLS LAST,
    rp.created_at DESC;
END;
$$;
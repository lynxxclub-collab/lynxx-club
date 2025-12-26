-- Strict browse function: returns only the opposite user_type for the logged-in viewer
-- and fails loudly when auth context is missing.

CREATE OR REPLACE FUNCTION public.get_browse_profiles_for_viewer()
RETURNS TABLE(
  id uuid,
  name text,
  date_of_birth date,
  gender public.gender,
  gender_preference public.gender[],
  location_city text,
  location_state text,
  bio text,
  profile_photos text[],
  user_type public.user_type,
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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_viewer_type text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Viewer must exist and be eligible to browse
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles viewer
    WHERE viewer.id = auth.uid()
      AND viewer.account_status = 'active'
      AND viewer.verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Viewer not active/verified';
  END IF;

  SELECT viewer.user_type::text
  INTO v_viewer_type
  FROM public.profiles viewer
  WHERE viewer.id = auth.uid();

  IF v_viewer_type IS NULL THEN
    RAISE EXCEPTION 'Viewer profile not found';
  END IF;

  RETURN QUERY
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
  WHERE p.account_status = 'active'
    AND p.verification_status = 'verified'
    AND p.id <> auth.uid()
    AND p.user_type::text <> v_viewer_type
    AND NOT EXISTS (
      SELECT 1
      FROM public.blocked_users b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p.id)
         OR (b.blocked_id = auth.uid() AND b.blocker_id = p.id)
    );
END;
$$;

-- Allow calling from the client (auth is still enforced inside the function)
GRANT EXECUTE ON FUNCTION public.get_browse_profiles_for_viewer() TO anon, authenticated;

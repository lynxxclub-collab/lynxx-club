-- Make profile-photos bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'profile-photos';

-- Make success-stories bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'success-stories';

-- Drop existing permissive SELECT policies for profile-photos
DROP POLICY IF EXISTS "Anyone can view profile photos" ON storage.objects;

-- Create new authenticated-only SELECT policy for profile-photos
CREATE POLICY "Authenticated users can view profile photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'profile-photos');

-- Drop existing permissive SELECT policies for success-stories
DROP POLICY IF EXISTS "Success story photos are publicly viewable" ON storage.objects;

-- Create new authenticated-only SELECT policy for success-stories
CREATE POLICY "Authenticated users can view success story photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'success-stories');

-- Add explicit search_path to update_user_rating function
CREATE OR REPLACE FUNCTION public.update_user_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- SECURITY: This trigger only updates the profile of the user being rated
  -- The rated_id comes from the NEW row in ratings table which has RLS
  UPDATE profiles
  SET 
    average_rating = (
      SELECT COALESCE(AVG(overall_rating), 0)
      FROM ratings
      WHERE rated_id = NEW.rated_id
    ),
    total_ratings = (
      SELECT COUNT(*)
      FROM ratings
      WHERE rated_id = NEW.rated_id
    )
  WHERE id = NEW.rated_id;
  RETURN NEW;
END;
$$;

-- Ensure get_browse_profiles has explicit search_path
CREATE OR REPLACE FUNCTION public.get_browse_profiles(p_target_user_type text, p_viewer_user_type text)
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
SET search_path = public
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

-- Ensure get_browse_profiles_all has explicit search_path
CREATE OR REPLACE FUNCTION public.get_browse_profiles_all()
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
SET search_path = public
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
  WHERE p.account_status = 'active'
    AND p.id <> auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.blocked_users b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p.id)
         OR (b.blocked_id = auth.uid() AND b.blocker_id = p.id)
    )
$$;

-- Ensure get_public_profile_by_id has explicit search_path
CREATE OR REPLACE FUNCTION public.get_public_profile_by_id(profile_id uuid)
RETURNS TABLE(
  id uuid, 
  name text, 
  date_of_birth date, 
  gender gender, 
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
  height text, 
  hobbies text[], 
  interests text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.name,
    p.date_of_birth,
    p.gender,
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
    p.height,
    p.hobbies,
    p.interests
  FROM public.profiles p
  WHERE p.id = profile_id
    AND p.account_status = 'active'
    AND p.verification_status = 'verified'
    AND p.name IS NOT NULL
    AND array_length(p.profile_photos, 1) > 0;
$$;

-- Ensure get_featured_earners has explicit search_path
CREATE OR REPLACE FUNCTION public.get_featured_earners()
RETURNS TABLE(id uuid, name text, profile_photo text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.name,
    p.profile_photos[1] as profile_photo
  FROM public.profiles p
  WHERE p.user_type = 'earner'
    AND p.account_status = 'active'
    AND p.verification_status = 'verified'
    AND p.name IS NOT NULL
    AND array_length(p.profile_photos, 1) > 0
  ORDER BY p.is_featured DESC, p.average_rating DESC NULLS LAST, p.created_at DESC
  LIMIT 8;
$$;

-- Ensure get_public_browse_profiles has explicit search_path
CREATE OR REPLACE FUNCTION public.get_public_browse_profiles()
RETURNS TABLE(
  id uuid, 
  name text, 
  date_of_birth date, 
  gender gender, 
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
  is_featured boolean, 
  featured_until timestamp with time zone, 
  height text, 
  hobbies text[], 
  interests text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.name,
    p.date_of_birth,
    p.gender,
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
    p.is_featured,
    p.featured_until,
    p.height,
    p.hobbies,
    p.interests
  FROM public.profiles p
  WHERE p.account_status = 'active'
    AND p.verification_status = 'verified'
    AND p.name IS NOT NULL
    AND array_length(p.profile_photos, 1) > 0
  ORDER BY p.is_featured DESC, p.average_rating DESC NULLS LAST, p.created_at DESC;
$$;

-- Ensure get_browse_profiles_for_viewer has explicit search_path (already has it)
-- Ensure get_public_browse_profiles_preview has explicit search_path (already has it)
-- Ensure get_featured_earners_preview has explicit search_path (already has it)
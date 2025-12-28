-- Fix: Replace date_of_birth with calculated age in public profile functions
-- Must drop functions first since return type is changing

-- 1. Drop existing functions
DROP FUNCTION IF EXISTS public.get_public_browse_profiles();
DROP FUNCTION IF EXISTS public.get_public_profile_by_id(uuid);

-- 2. Recreate get_public_browse_profiles with age instead of date_of_birth
CREATE FUNCTION public.get_public_browse_profiles()
RETURNS TABLE(
  id uuid, 
  name text, 
  age integer,
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
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    p.id,
    p.name,
    EXTRACT(YEAR FROM AGE(p.date_of_birth))::integer as age,
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
$function$;

-- 3. Recreate get_public_profile_by_id with age instead of date_of_birth
CREATE FUNCTION public.get_public_profile_by_id(profile_id uuid)
RETURNS TABLE(
  id uuid, 
  name text, 
  age integer,
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
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    p.id,
    p.name,
    EXTRACT(YEAR FROM AGE(p.date_of_birth))::integer as age,
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
$function$;

-- 4. Fix chat-images storage policy to use exact path matching instead of LIKE
DROP POLICY IF EXISTS "Users can view chat images in their conversations" ON storage.objects;

CREATE POLICY "Users can view chat images in their conversations"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-images' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversations c ON m.conversation_id = c.id
      WHERE m.message_type = 'image'
        AND m.content = name
        AND (c.seeker_id = auth.uid() OR c.earner_id = auth.uid())
    )
  )
);
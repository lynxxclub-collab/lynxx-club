-- Drop existing functions first (return type is changing)
DROP FUNCTION IF EXISTS public.get_featured_earners_preview();
DROP FUNCTION IF EXISTS public.get_public_browse_profiles_preview();

-- Recreate get_featured_earners_preview() with profile_photo
CREATE OR REPLACE FUNCTION public.get_featured_earners_preview()
RETURNS TABLE(id uuid, first_name text, profile_photo text, has_photo boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.id,
    split_part(p.name, ' ', 1) as first_name,
    p.profile_photos[1] as profile_photo,
    (array_length(p.profile_photos, 1) > 0) as has_photo
  FROM public.profiles p
  WHERE p.user_type = 'earner'
    AND p.account_status = 'active'
    AND p.verification_status = 'verified'
    AND p.name IS NOT NULL
    AND array_length(p.profile_photos, 1) > 0
  ORDER BY p.is_featured DESC, p.average_rating DESC NULLS LAST, p.created_at DESC
  LIMIT 8;
$$;

-- Recreate get_public_browse_profiles_preview() with profile_photo
CREATE OR REPLACE FUNCTION public.get_public_browse_profiles_preview()
RETURNS TABLE(id uuid, first_name text, location_city text, user_type user_type, is_featured boolean, has_photo boolean, profile_photo text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.id,
    split_part(p.name, ' ', 1) as first_name,
    p.location_city,
    p.user_type,
    COALESCE(p.is_featured, false) as is_featured,
    (array_length(p.profile_photos, 1) > 0) as has_photo,
    p.profile_photos[1] as profile_photo
  FROM public.profiles p
  WHERE p.account_status = 'active'
    AND p.verification_status = 'verified'
    AND p.name IS NOT NULL
    AND array_length(p.profile_photos, 1) > 0
  ORDER BY p.is_featured DESC, p.created_at DESC
  LIMIT 50;
$$;
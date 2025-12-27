-- Create a limited preview function for anonymous users
-- Returns only first name and city, no sensitive details
CREATE OR REPLACE FUNCTION public.get_public_browse_profiles_preview()
RETURNS TABLE(
  id uuid,
  first_name text,
  location_city text,
  user_type user_type,
  is_featured boolean,
  has_photo boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    split_part(p.name, ' ', 1) as first_name,
    p.location_city,
    p.user_type,
    COALESCE(p.is_featured, false) as is_featured,
    (array_length(p.profile_photos, 1) > 0) as has_photo
  FROM public.profiles p
  WHERE p.account_status = 'active'
    AND p.verification_status = 'verified'
    AND p.name IS NOT NULL
    AND array_length(p.profile_photos, 1) > 0
  ORDER BY p.is_featured DESC, p.created_at DESC
  LIMIT 50;
$$;

-- Revoke anonymous access from the full profile functions
REVOKE EXECUTE ON FUNCTION public.get_public_browse_profiles() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_public_profile_by_id(uuid) FROM anon;

-- Grant anonymous access to the preview function only
GRANT EXECUTE ON FUNCTION public.get_public_browse_profiles_preview() TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_browse_profiles_preview() TO authenticated;

-- Create a limited preview for featured earners (homepage)
CREATE OR REPLACE FUNCTION public.get_featured_earners_preview()
RETURNS TABLE(
  id uuid,
  first_name text,
  has_photo boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    split_part(p.name, ' ', 1) as first_name,
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

-- Grant access to preview function
GRANT EXECUTE ON FUNCTION public.get_featured_earners_preview() TO anon;
GRANT EXECUTE ON FUNCTION public.get_featured_earners_preview() TO authenticated;
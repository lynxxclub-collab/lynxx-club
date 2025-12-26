-- Create a function to get featured earners for public display
-- Only exposes safe, limited data (id, name, first profile photo)
CREATE OR REPLACE FUNCTION public.get_featured_earners()
RETURNS TABLE(
  id uuid,
  name text,
  profile_photo text
)
LANGUAGE sql
STABLE SECURITY DEFINER
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
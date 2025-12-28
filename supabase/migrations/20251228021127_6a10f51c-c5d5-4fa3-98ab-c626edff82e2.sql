-- Revoke anonymous access to profile functions that expose too much data
-- Anonymous users should only use get_public_browse_profiles_preview which returns limited data

-- Revoke anon access from get_public_browse_profiles (exposes full profile data)
REVOKE EXECUTE ON FUNCTION public.get_public_browse_profiles() FROM anon;

-- Revoke anon access from get_public_profile_by_id (exposes full profile by ID)
REVOKE EXECUTE ON FUNCTION public.get_public_profile_by_id(uuid) FROM anon;

-- Note: get_public_browse_profiles_preview and get_featured_earners_preview
-- are designed for anonymous access and return limited data (first name only, no DOB, etc.)
-- Those should remain accessible to anon role
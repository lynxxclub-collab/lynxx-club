-- Drop the problematic policy that exposes email to verified users
DROP POLICY IF EXISTS "Verified users can browse other verified profiles" ON public.profiles;

-- The remaining policies are secure:
-- 1. "Users can view their own profile" - users can only see their own data (including email)
-- 2. "Admins can view all profiles" - admins need full access for moderation
-- 3. "Users can insert their own profile" - only own profile
-- 4. "Users can update their own profile" - only own profile

-- All cross-user browsing MUST go through get_browse_profiles RPC function which:
-- 1. Excludes sensitive fields like email
-- 2. Verifies the viewer is a verified user
-- 3. Returns only verified, active profiles of the appropriate user type
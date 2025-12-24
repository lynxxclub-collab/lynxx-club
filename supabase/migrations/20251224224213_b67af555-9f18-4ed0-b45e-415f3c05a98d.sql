-- Fix: Remove overly permissive profile access policy
-- The current "Unverified users can only view own profile" policy allows any verified user 
-- to see ALL data of all other verified users, exposing sensitive PII.

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Unverified users can only view own profile" ON public.profiles;

-- The remaining policies provide proper access:
-- 1. "Users can view their own profile" - users see their own full data
-- 2. "Seekers can only view verified Earners" - seekers see earners for browsing
-- 3. "Admins can view all profiles" - admins can manage users

-- Now add a symmetric policy for earners to view seekers (for browse functionality)
CREATE POLICY "Earners can view verified Seekers"
ON public.profiles FOR SELECT
USING (
  (user_type = 'seeker' AND verification_status = 'verified' AND account_status = 'active')
  OR auth.uid() = id
);
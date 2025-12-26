-- Fix 1: Add missing admin policies for reports table
CREATE POLICY "Admins can view all reports"
ON public.reports FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reports"
ON public.reports FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Fix 2: Recreate profiles_browse view without SECURITY DEFINER
-- Drop and recreate as a regular view (SECURITY INVOKER is the default)
DROP VIEW IF EXISTS public.profiles_browse;

CREATE VIEW public.profiles_browse 
WITH (security_invoker = true)
AS
SELECT 
  id,
  name,
  date_of_birth,
  gender,
  gender_preference,
  location_city,
  location_state,
  bio,
  profile_photos,
  user_type,
  video_15min_rate,
  video_30min_rate,
  video_60min_rate,
  video_90min_rate,
  average_rating,
  total_ratings,
  created_at,
  verification_status,
  account_status,
  is_featured,
  featured_until,
  height,
  hobbies,
  interests
FROM public.profiles
WHERE verification_status = 'verified' AND account_status = 'active';
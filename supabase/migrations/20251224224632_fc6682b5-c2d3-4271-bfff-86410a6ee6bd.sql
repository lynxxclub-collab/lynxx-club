-- Add RLS policies for the profiles_browse view
-- These control who can see which profiles through the view

-- Seekers can view verified active earners
CREATE POLICY "Seekers can browse verified earners"
ON public.profiles FOR SELECT
USING (
  -- Allow if the row is a verified active earner AND the viewer is a seeker
  (
    user_type = 'earner' 
    AND verification_status = 'verified' 
    AND account_status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.profiles viewer 
      WHERE viewer.id = auth.uid() 
      AND viewer.user_type = 'seeker'
      AND viewer.verification_status = 'verified'
    )
  )
  -- OR it's the user's own profile (handled by existing policy, but included for completeness)
  OR auth.uid() = id
);

-- Earners can view verified active seekers
CREATE POLICY "Earners can browse verified seekers"
ON public.profiles FOR SELECT
USING (
  -- Allow if the row is a verified active seeker AND the viewer is an earner
  (
    user_type = 'seeker' 
    AND verification_status = 'verified' 
    AND account_status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.profiles viewer 
      WHERE viewer.id = auth.uid() 
      AND viewer.user_type = 'earner'
      AND viewer.verification_status = 'verified'
    )
  )
  -- OR it's the user's own profile
  OR auth.uid() = id
);
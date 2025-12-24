-- Drop existing policies that conflict with new verification-based policies
DROP POLICY IF EXISTS "Seekers can view earner profiles" ON public.profiles;
DROP POLICY IF EXISTS "Earners can view seeker profiles" ON public.profiles;

-- Unverified users can ONLY view their own profile, verified users can view other verified users
CREATE POLICY "Unverified users can only view own profile"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id 
    OR verification_status = 'verified'
  );

-- Only verified Earners show in browse for Seekers
CREATE POLICY "Seekers can only view verified Earners"
  ON public.profiles FOR SELECT
  USING (
    (user_type = 'earner' AND verification_status = 'verified' AND account_status = 'active')
    OR auth.uid() = id
  );

-- Only verified users can send messages
CREATE POLICY "Only verified users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.verification_status = 'verified'
    )
  );

-- Only verified users can book video dates
CREATE POLICY "Only verified users can book video dates"
  ON public.video_dates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.verification_status = 'verified'
    )
  );
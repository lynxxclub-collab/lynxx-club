-- Allow authenticated users to view active, verified profiles
CREATE POLICY "Authenticated users can view active profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND account_status = 'active' 
  AND verification_status = 'verified'
);
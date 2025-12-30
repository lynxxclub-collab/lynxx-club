-- Allow authenticated users to view active, verified profiles
CREATE POLICY "Authenticated users can view active verified profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  account_status = 'active' 
  AND verification_status = 'verified'
);
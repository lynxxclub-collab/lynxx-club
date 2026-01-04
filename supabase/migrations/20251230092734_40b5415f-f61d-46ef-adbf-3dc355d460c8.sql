-- Create a secure server-side function to check if current user is admin
-- SECURITY DEFINER allows it to read user_roles even when RLS would block it
-- This function is safe because it returns only a boolean (no data leakage)

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
  );
$$;

-- Optional: lock down who can execute it (recommended)
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
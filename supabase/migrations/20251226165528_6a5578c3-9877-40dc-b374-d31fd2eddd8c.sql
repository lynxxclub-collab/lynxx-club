-- Allow admins to view all user roles (needed to see who is admin)
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to grant admin role to users
CREATE POLICY "Admins can grant admin role"
ON public.user_roles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Allow admins to revoke admin role from users (but not themselves)
CREATE POLICY "Admins can revoke admin role"
ON public.user_roles
FOR DELETE
USING (has_role(auth.uid(), 'admin') AND user_id != auth.uid());
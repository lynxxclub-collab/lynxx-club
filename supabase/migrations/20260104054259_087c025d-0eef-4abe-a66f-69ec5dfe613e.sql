-- Enable RLS on the profiles_browse view
ALTER VIEW profiles_browse SET (security_invoker = true);

-- Note: Views in PostgreSQL don't support RLS policies directly
-- The security_invoker option ensures the view respects the calling user's permissions
-- on the underlying tables. Since profiles table has proper RLS, the view will inherit those.

-- Revoke anon access to ensure unauthenticated users can't query the view
REVOKE SELECT ON profiles_browse FROM anon;

-- Grant access only to authenticated users
GRANT SELECT ON profiles_browse TO authenticated;
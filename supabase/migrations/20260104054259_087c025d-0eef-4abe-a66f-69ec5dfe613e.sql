-- ==========================================================
-- Secure profiles_browse view (Supabase / Lovable safe)
-- ==========================================================

-- Ensure the view runs with caller privileges (respects RLS)
ALTER VIEW public.profiles_browse
SET (security_invoker = true);

-- Explicitly restrict unauthenticated access
REVOKE ALL ON public.profiles_browse FROM anon;

-- Allow authenticated users to browse profiles
GRANT SELECT ON public.profiles_browse TO authenticated;

-- (Optional but recommended) Ensure correct ownership
ALTER VIEW public.profiles_browse OWNER TO postgres;
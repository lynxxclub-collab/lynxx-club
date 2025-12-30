-- Remove the public SELECT policy that exposes platform settings
DROP POLICY IF EXISTS "Anyone can read platform settings" ON public.platform_settings;

-- The table already has an admin ALL policy: "Admins can manage platform settings"
-- This will remain as the only access policy, restricting access to admins only
-- ============================================================================
-- WALLETS RLS (secure + admin visibility + user self-access)
-- NOTE: Supabase "service_role" bypasses RLS via service key, not via TO service_role
-- ============================================================================

-- Enable RLS (safe if already enabled)
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Drop old policies to avoid duplicates / conflicts
DROP POLICY IF EXISTS "Users can view their own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Users can update their own wallet" ON public.wallets;
DROP POLICY IF EXISTS "System can insert wallets" ON public.wallets;
DROP POLICY IF EXISTS "Admins can view all wallets" ON public.wallets;
DROP POLICY IF EXISTS "Admins can update all wallets" ON public.wallets;
DROP POLICY IF EXISTS "Service role can manage wallets" ON public.wallets;

-- ----------------------------------------------------------------------------
-- 1) Users can view their own wallet
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view their own wallet"
ON public.wallets
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 2) Users can insert their own wallet (your app does this with ON CONFLICT DO NOTHING)
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can insert their own wallet"
ON public.wallets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3) Users generally should NOT be able to update their wallet balances directly.
-- If you need them to update only safe fields (like payout settings), limit columns
-- in your app/update function. RLS can’t restrict columns by itself.
-- So: deny direct UPDATE by default (do nothing here).
-- Your SECURITY DEFINER functions (send_message, reserve, etc.) will still work.
-- ----------------------------------------------------------------------------
-- (Intentionally no general UPDATE policy for users.)

-- ----------------------------------------------------------------------------
-- 4) Admins can view all wallets
-- ----------------------------------------------------------------------------
CREATE POLICY "Admins can view all wallets"
ON public.wallets
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ----------------------------------------------------------------------------
-- 5) Admins can update all wallets (optional; keep only if you truly want this)
-- ----------------------------------------------------------------------------
CREATE POLICY "Admins can update all wallets"
ON public.wallets
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- Allow admins to view all wallets
CREATE POLICY "Admins can view all wallets"
ON public.wallets
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update any wallet (for testing/adjustments)
CREATE POLICY "Admins can update all wallets"
ON public.wallets
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow service role full access (for edge functions)
CREATE POLICY "Service role can manage wallets"
ON public.wallets
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow system to insert wallets for new users
CREATE POLICY "System can insert wallets"
ON public.wallets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
-- =============================================================================
-- TRIGGER FUNCTIONS (Called automatically by database triggers)
-- =============================================================================

COMMENT ON FUNCTION public.create_wallet_for_new_user() IS 
'TRIGGER: Auto-creates a wallet record when a new profile is inserted.
SECURITY DEFINER required: Trigger executes during signup when the user has no RLS permissions on wallets.
Security controls: Only triggered by INSERT on profiles. Uses NEW.id from trigger context. ON CONFLICT DO NOTHING prevents duplicates.';

COMMENT ON FUNCTION public.handle_new_user() IS 
'TRIGGER: Creates a profile and assigns default "user" role when auth.users row is created.
SECURITY DEFINER required: Must INSERT into profiles and user_roles during signup before user session exists.
Security controls: Triggered only by auth.users INSERT (Supabase-controlled). Uses auth system values only.';

COMMENT ON FUNCTION public.update_user_rating() IS 
'TRIGGER: Recalculates average_rating and total_ratings when a rating is inserted.
SECURITY DEFINER required: Must UPDATE another user''s profile (the rated user).
Security controls: Triggered only by ratings INSERT. rated_id is protected by ratings RLS.';

COMMENT ON FUNCTION public.update_updated_at_column() IS 
'TRIGGER: Automatically updates updated_at timestamp on row modification.
SECURITY DEFINER required: Must modify rows regardless of caller privileges.
Security controls: Only touches updated_at field. No user input processed.';

COMMENT ON FUNCTION public.enforce_creator_cap() IS 
'TRIGGER: Prevents more than 50 active earners from existing simultaneously.
SECURITY DEFINER required: Must count all active earners across profiles.
Security controls: Triggered only on profile UPDATE. Aborts transaction if cap exceeded.';

-- =============================================================================
-- BROWSE / READ FUNCTIONS
-- =============================================================================

COMMENT ON FUNCTION public.get_browse_profiles(text, text) IS 
'Returns browsable profiles filtered by user type for verified users.
SECURITY DEFINER required: Must read profiles across all users.
Security controls: Caller must be verified. Only active, verified profiles returned. No sensitive fields exposed.';

COMMENT ON FUNCTION public.get_browse_profiles_all() IS 
'Returns all active profiles excluding blocked users.
SECURITY DEFINER required: Requires cross-user profile reads.
Security controls: Excludes blocked relationships and caller profile.';

COMMENT ON FUNCTION public.get_browse_profiles_for_viewer() IS 
'Returns prioritized profiles using activity_score ranking.
SECURITY DEFINER required: Aggregates and ranks profiles across users.
Security controls: Requires verified active caller. Filters blocked users.';

COMMENT ON FUNCTION public.get_public_profile_by_id(uuid) IS 
'Returns a single public profile for unauthenticated viewing.
SECURITY DEFINER required: Allows public read access to limited profile data.
Security controls: Only active, verified profiles with photos. Age is derived; DOB not exposed.';

COMMENT ON FUNCTION public.get_featured_earners() IS 
'Returns featured earner profiles for homepage display.
SECURITY DEFINER required: Reads across all earner profiles.
Security controls: Only verified, active earners with photos. Minimal fields returned.';

-- =============================================================================
-- FINANCIAL / CREDIT FUNCTIONS (WALLETS = SOURCE OF TRUTH)
-- =============================================================================

COMMENT ON FUNCTION public.send_message(uuid, uuid, uuid, text, text) IS 
'Processes a paid message transaction.
SECURITY DEFINER required: Atomically updates wallets for sender and recipient, inserts messages and transactions.
Security controls: Validates auth.uid() = sender_id. Locks wallet rows FOR UPDATE. Checks sufficient balance before deduction.';

COMMENT ON FUNCTION public.send_gift(uuid, uuid, uuid, uuid, text) IS 
'Processes gift transaction between users.
SECURITY DEFINER required: Updates wallets, gift_transactions, transactions, and platform ledger atomically.
Security controls: Validates auth.uid() = sender. Validates gift is active. Uses row locks.';

COMMENT ON FUNCTION public.reserve_credits_for_video_date(uuid, uuid, integer) IS 
'Reserves credits in wallet for an upcoming video date.
SECURITY DEFINER required: Deducts wallet credits and inserts credit_reservations atomically.
Security controls: Validates auth.uid(). Checks sufficient wallet balance. Creates audit transaction.';

COMMENT ON FUNCTION public.release_credit_reservation(uuid, text) IS 
'Releases reserved video date credits back to wallet.
SECURITY DEFINER required: Must restore wallet balance and update reservation status.
Security controls: Caller must be a participant in the video date. Only active reservations refunded.';

COMMENT ON FUNCTION public.charge_video_date_transaction(uuid, uuid, uuid, integer, numeric, numeric, numeric) IS 
'Finalizes video date payment.
SECURITY DEFINER required: Updates wallets, video_dates, and transactions atomically.
Security controls: Caller must be seeker or earner. Wallet balances locked before mutation.';

COMMENT ON FUNCTION public.unlock_image(uuid) IS 
'Processes image unlock transaction.
SECURITY DEFINER required: Deducts viewer credits and adds sender earnings using wallets.
Security controls: Validates auth.uid(). Validates message ownership and type. Prevents duplicate unlocks.';

COMMENT ON FUNCTION public.process_expired_message_refunds() IS 
'Scheduled job: refunds credits for messages without replies after deadline.
SECURITY DEFINER required: Must update wallets across multiple users.
Security controls: Time-bound, idempotent, no user input.';

-- =============================================================================
-- ADMIN / ROLE FUNCTIONS
-- =============================================================================

COMMENT ON FUNCTION public.approve_creator_application(uuid) IS 
'Admin-only: approves a creator application.
SECURITY DEFINER required: Updates profiles and user_roles for another user.
Security controls: Requires admin role. Enforces creator cap.';

COMMENT ON FUNCTION public.reject_creator_application(uuid, text) IS 
'Admin-only: rejects a creator application.
SECURITY DEFINER required: Updates creator_applications.
Security controls: Requires admin role. Only pending applications allowed.';

COMMENT ON FUNCTION public.has_role(uuid, app_role) IS 
'Checks whether a user has a specific role.
SECURITY DEFINER required: Used in RLS evaluation.
Security controls: Read-only boolean return.';

COMMENT ON FUNCTION public.is_admin() IS 
'Returns whether current user has admin role.
SECURITY DEFINER required: RLS helper function.
Security controls: Boolean only.';

-- =============================================================================
-- RLS / UTILITY HELPERS
-- =============================================================================

COMMENT ON FUNCTION public.is_own_profile(uuid) IS 
'Checks whether profile_id matches auth.uid().
SECURITY DEFINER required: Used inside RLS policies.
Security controls: Boolean comparison only.';

COMMENT ON FUNCTION public.check_account_switch() IS 
'Returns pending account type switch for current user.
SECURITY DEFINER required: Reads switch state during RLS evaluation.
Security controls: Only returns data for auth.uid().';
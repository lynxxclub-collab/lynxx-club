-- Add documentation comments to all SECURITY DEFINER functions explaining their purpose,
-- why elevated privileges are required, and what security controls are in place.

-- =============================================================================
-- TRIGGER FUNCTIONS (Called automatically by database triggers)
-- =============================================================================

COMMENT ON FUNCTION public.create_wallet_for_new_user() IS 
'TRIGGER: Auto-creates wallet record when a new profile is inserted.
SECURITY DEFINER required: Trigger functions execute in the context of the triggering user who may not have direct INSERT access to the wallets table due to RLS policies.
Security controls: Only triggered by INSERT on profiles table. Uses NEW.id from the triggering row, preventing injection. ON CONFLICT DO NOTHING prevents duplicates.';

COMMENT ON FUNCTION public.handle_new_user() IS 
'TRIGGER: Creates profile and assigns default "user" role when auth.users row is created.
SECURITY DEFINER required: Must INSERT into profiles and user_roles tables during signup before the user has any RLS-accessible session.
Security controls: Only triggered by auth.users INSERT (Supabase internal). Uses NEW.id and NEW.email from the auth system, not user input.';

COMMENT ON FUNCTION public.update_user_rating() IS 
'TRIGGER: Recalculates average_rating and total_ratings on profiles when a rating is inserted.
SECURITY DEFINER required: Must UPDATE profiles table for a user other than the rater (the rated_id). Normal RLS only allows users to update their own profile.
Security controls: Only triggered by INSERT on ratings table. The rated_id comes from the NEW row which has its own RLS policy requiring rater_id = auth.uid().';

COMMENT ON FUNCTION public.update_updated_at_column() IS 
'TRIGGER: Sets updated_at = NOW() before any UPDATE on attached tables.
SECURITY DEFINER required: Standard pattern for timestamp triggers. Must modify the row being updated regardless of which user is performing the update.
Security controls: Only modifies the updated_at column of the row being updated. No user input is processed.';

COMMENT ON FUNCTION public.enforce_creator_cap() IS 
'TRIGGER: Prevents more than 50 active earners by blocking user_type changes to "earner" when cap is reached.
SECURITY DEFINER required: Must call get_creator_cap_status() and access profiles count across all users.
Security controls: Only triggered by UPDATE on profiles. Raises exception to abort transaction if cap exceeded - no data modification occurs.';

-- =============================================================================
-- BROWSE/QUERY FUNCTIONS (Read-only data access)
-- =============================================================================

COMMENT ON FUNCTION public.get_browse_profiles(text, text) IS 
'Returns browsable profiles filtered by user type for authenticated verified users.
SECURITY DEFINER required: Must query profiles table across all users while RLS restricts profiles to own-profile-only access.
Security controls: Validates caller exists in profiles with verification_status = "verified". Only returns profiles where account_status = "active" AND verification_status = "verified". Excludes sensitive columns (email, earnings, stripe info).';

COMMENT ON FUNCTION public.get_browse_profiles_all() IS 
'Returns all active profiles excluding blocked users for authenticated users.
SECURITY DEFINER required: Must query profiles table across all users and check blocked_users relationships.
Security controls: Requires auth.uid() to be set. Excludes own profile (id <> auth.uid()). Filters out blocked relationships in both directions. Only returns active accounts.';

COMMENT ON FUNCTION public.get_browse_profiles_for_viewer() IS 
'Returns prioritized browsable profiles with activity scoring for authenticated verified users.
SECURITY DEFINER required: Must aggregate and rank profiles across all users with complex business logic.
Security controls: Validates caller is active AND verified before returning results. Excludes blocked relationships. Only returns active, verified profiles. Raises exception if caller not eligible.';

COMMENT ON FUNCTION public.get_public_browse_profiles() IS 
'Returns public profile data for unauthenticated browse preview.
SECURITY DEFINER required: Must access profiles table without authentication for landing page display.
Security controls: Only returns profiles where account_status = "active" AND verification_status = "verified" AND has photos. Returns limited fields - excludes earnings, credit balance, stripe info, email. Calculates age from DOB rather than exposing DOB.';

COMMENT ON FUNCTION public.get_public_browse_profiles_preview() IS 
'Returns minimal profile preview data (first name, city, photo) for unauthenticated users.
SECURITY DEFINER required: Must access profiles table without authentication for landing page.
Security controls: Returns only: id, first_name (split from full name), location_city, user_type, is_featured, has_photo, profile_photo. All sensitive data excluded. Limited to 50 results.';

COMMENT ON FUNCTION public.get_public_profile_by_id(uuid) IS 
'Returns single public profile by ID for unauthenticated profile preview.
SECURITY DEFINER required: Must access specific profile without authentication.
Security controls: Only returns if profile is active, verified, has name and photos. Returns limited public fields only. Calculates age instead of exposing DOB.';

COMMENT ON FUNCTION public.get_featured_earners() IS 
'Returns top 8 featured earner profiles for homepage display.
SECURITY DEFINER required: Must query across all earner profiles without authentication.
Security controls: Only returns verified, active earners with photos. Returns only: id, name, first profile photo. Excludes all sensitive data.';

COMMENT ON FUNCTION public.get_featured_earners_preview() IS 
'Returns minimal featured earner data (first name only) for unauthenticated preview.
SECURITY DEFINER required: Must access profiles without authentication for landing page.
Security controls: Returns only: id, first_name (extracted), profile_photo, has_photo flag. Limited to 8 results. Only active, verified earners.';

COMMENT ON FUNCTION public.get_conversation_participant_profile(uuid) IS 
'Returns limited profile data for a conversation participant.
SECURITY DEFINER required: Must access another user profile data for conversation display.
Security controls: Validates that auth.uid() is a participant in a conversation with the requested profile_id. Only returns: id, name, photos, video rates. Prevents accessing profiles of users you have no conversation with.';

COMMENT ON FUNCTION public.get_top_gifters_daily(uuid, integer) IS 
'Returns ranked daily top gifters for a specific creator.
SECURITY DEFINER required: Must aggregate gift_transactions across multiple senders and join with their profiles.
Security controls: Read-only aggregation. Respects hidden_gifters table to exclude opted-out users. Time-bounded to last 24 hours.';

COMMENT ON FUNCTION public.get_top_gifters_weekly(uuid, integer) IS 
'Returns ranked weekly top gifters for a specific creator.
SECURITY DEFINER required: Must aggregate gift_transactions across multiple senders and join with their profiles.
Security controls: Read-only aggregation. Respects hidden_gifters table. Time-bounded to last 7 days.';

COMMENT ON FUNCTION public.get_top_gifters_alltime(uuid, integer) IS 
'Returns ranked all-time top gifters for a specific creator.
SECURITY DEFINER required: Must aggregate all gift_transactions for a creator and join with sender profiles.
Security controls: Read-only aggregation. Respects hidden_gifters exclusions. Returns limited profile data only.';

COMMENT ON FUNCTION public.get_user_rank_info(uuid, uuid) IS 
'Returns a user current rank and credits needed to advance on a creator leaderboard.
SECURITY DEFINER required: Must query gift_transactions and calculate rankings across all gifters.
Security controls: Read-only. Respects hidden_gifters. Returns only: rank, credits, next_rank info - no PII.';

COMMENT ON FUNCTION public.get_launch_signup_counts() IS 
'Returns aggregate counts of launch signups by user type.
SECURITY DEFINER required: Must count across all launch_signups records.
Security controls: Returns only two integers (seeker_count, earner_count). No PII exposed.';

COMMENT ON FUNCTION public.get_creator_cap_status() IS 
'Returns current creator count vs cap limit for waitlist logic.
SECURITY DEFINER required: Must count all active verified earners in profiles table.
Security controls: Returns only: current_count, limit, is_capped, spots_remaining. No PII.';

-- =============================================================================
-- FINANCIAL TRANSACTION FUNCTIONS (Atomic money/credit operations)
-- =============================================================================

COMMENT ON FUNCTION public.send_message(uuid, uuid, uuid, text, text) IS 
'Processes paid message: deducts sender credits, adds earner earnings, creates message record.
SECURITY DEFINER required: Must atomically UPDATE two different users profiles (sender credit_balance, recipient earnings_balance), INSERT into messages and transactions tables.
Security controls: VALIDATES auth.uid() = p_sender_id at function start - returns error if mismatch. Uses FOR UPDATE row locking. Validates sufficient balance before deduction.';

COMMENT ON FUNCTION public.send_gift(uuid, uuid, uuid, uuid, text) IS 
'Processes gift transaction: deducts sender credits from wallet, adds pending earnings to recipient wallet, records in gift_transactions and platform_ledger.
SECURITY DEFINER required: Must UPDATE wallets for both sender and recipient, INSERT into gift_transactions, transactions, and platform_ledger tables atomically.
Security controls: VALIDATES auth.uid() = p_sender_id at function start. Validates gift exists and is active. Uses FOR UPDATE locking. Ensures recipient wallet exists before update.';

COMMENT ON FUNCTION public.reserve_credits_for_video_date(uuid, uuid, integer) IS 
'Reserves credits from user balance for upcoming video date (held until completed or cancelled).
SECURITY DEFINER required: Must UPDATE profiles credit_balance and INSERT into credit_reservations atomically.
Security controls: VALIDATES auth.uid() = p_user_id. Checks sufficient balance with FOR UPDATE lock. Creates audit trail in transactions table.';

COMMENT ON FUNCTION public.release_credit_reservation(uuid, text) IS 
'Refunds reserved credits back to user when video date is cancelled.
SECURITY DEFINER required: Must UPDATE profiles to restore credits and UPDATE credit_reservations status.
Security controls: Validates auth.uid() is either seeker_id or earner_id of the video_date. Only processes "active" reservations.';

COMMENT ON FUNCTION public.charge_video_date_transaction(uuid, uuid, uuid, integer, numeric, numeric, numeric) IS 
'Finalizes video date payment: deducts seeker credits, adds earner earnings, marks date completed.
SECURITY DEFINER required: Must UPDATE profiles for both users, UPDATE video_dates status, INSERT transaction records atomically.
Security controls: VALIDATES auth.uid() is either p_seeker_id or p_earner_id. Uses FOR UPDATE lock on seeker profile.';

COMMENT ON FUNCTION public.mark_reservation_charged(uuid) IS 
'Marks a credit reservation as charged (called after successful video date completion).
SECURITY DEFINER required: Must UPDATE credit_reservations status regardless of which user triggers completion.
Security controls: Only processes "active" reservations. Read-then-update pattern with FOR UPDATE lock.';

COMMENT ON FUNCTION public.unlock_image(uuid) IS 
'Processes image unlock: deducts viewer credits from wallet, adds pending earnings to sender wallet.
SECURITY DEFINER required: Must UPDATE wallets for both viewer and image sender, INSERT into image_unlocks and transactions.
Security controls: Validates auth.uid() is set. Validates message exists, is type "image", and recipient_id = auth.uid(). Prevents double-unlock. Uses FOR UPDATE locking.';

COMMENT ON FUNCTION public.process_pending_earnings() IS 
'Scheduled job: moves pending earnings to available after 48-hour hold period.
SECURITY DEFINER required: Must UPDATE wallets across all users to move funds from pending_earnings to available_earnings.
Security controls: Only processes gift_transactions older than 48 hours with "completed" status. Uses processed_earnings table to prevent double-processing. Idempotent operation.';

-- =============================================================================
-- ADMIN FUNCTIONS (Role-restricted operations)
-- =============================================================================

COMMENT ON FUNCTION public.approve_creator_application(uuid) IS 
'Admin action: approves pending creator application, updates profile to earner, assigns creator role.
SECURITY DEFINER required: Must UPDATE creator_applications, UPDATE profiles user_type, INSERT into user_roles for another user.
Security controls: VALIDATES has_role(auth.uid(), "admin") at start - returns error if not admin. Checks creator cap before approval. Only processes "pending" applications.';

COMMENT ON FUNCTION public.reject_creator_application(uuid, text) IS 
'Admin action: rejects creator application with optional reason.
SECURITY DEFINER required: Must UPDATE creator_applications for another user.
Security controls: VALIDATES has_role(auth.uid(), "admin") at start. Only processes "pending" applications.';

COMMENT ON FUNCTION public.is_admin() IS 
'Returns whether current user has admin role (used in RLS policies).
SECURITY DEFINER required: Must query user_roles table which has restrictive RLS.
Security controls: Only checks auth.uid() against user_roles. Returns boolean only - no data exposure.';

COMMENT ON FUNCTION public.has_role(uuid, app_role) IS 
'Returns whether specified user has specified role (used in RLS policies).
SECURITY DEFINER required: Must query user_roles table for RLS policy evaluation.
Security controls: Read-only check. Returns boolean only. Used by RLS policies to gate access.';

-- =============================================================================
-- HELPER FUNCTIONS (Utility operations)
-- =============================================================================

COMMENT ON FUNCTION public.is_own_profile(uuid) IS 
'Returns whether the given profile_id matches auth.uid() (used in RLS policies).
SECURITY DEFINER required: Must be callable during RLS evaluation.
Security controls: Simple comparison of auth.uid() = parameter. Returns boolean only.';

COMMENT ON FUNCTION public.check_account_switch() IS 
'Returns pending account type switch status for current user.
SECURITY DEFINER required: Must query account_type_switches table which may have complex RLS.
Security controls: Only queries for auth.uid(). Returns own pending switch data only.';
/* ============================================================================
   NOTIFICATIONS TABLE + RLS (SAFE / FIXED / COPY-PASTE)
   - Adds missing FK to auth.users (optional but recommended)
   - Ensures INSERT policy works for trigger functions (SECURITY DEFINER)
   - Adds UPDATE check so users can only mark THEIR notifications read
   - Includes realtime
   ============================================================================ */

-- 0) Create table (only if it doesn't exist yet)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_id UUID,
  related_type TEXT,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 1) Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON public.notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, read_at)
  WHERE read_at IS NULL;

-- 2) RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 3) Drop old policies (so you can re-run migrations safely)
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- 4) Policies

-- Users can only read their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can only update their own notifications
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow inserts from authenticated context (including SECURITY DEFINER triggers)
-- NOTE: We keep this broad because the insert is done server-side via triggers.
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- (Optional) if you ever insert from service role only, you can also allow anon:
-- CREATE POLICY "System can insert notifications (anon)"
-- ON public.notifications FOR INSERT TO anon WITH CHECK (true);

-- 5) Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

/* ============================================================================
   WHERE TO PLACE THIS
   Lovable -> Backend -> Database -> Migrations:
   - Create a NEW migration file, paste this whole SQL in it, and run.
   OR if Lovable has a SQL Runner, paste and run once.
   ============================================================================ */
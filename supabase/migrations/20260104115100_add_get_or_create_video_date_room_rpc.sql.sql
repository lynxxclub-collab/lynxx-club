-- =============================================
-- MIGRATION: Fix Daily.co "two separate rooms" bug
-- Purpose:
--   1) Persist ONE shared Daily room per video_date_id
--   2) Prevent race conditions that create multiple rooms
--   3) Ensure both users fetch the SAME room_url (or room_name placeholder)
--
-- How it works:
--   - Adds daily_room_name + daily_room_url columns to public.video_dates
--   - Adds a SECURITY DEFINER RPC:
--       public.get_or_create_video_date_room(video_date_id)
--     which locks the video_dates row and either:
--       a) returns existing daily_room_url (preferred), OR
--       b) reserves/stores a stable daily_room_name (vd_<video_date_id>) and returns it
--
-- NOTE:
--   Creating the actual Daily room requires your Daily API key, so do that in an Edge Function.
--   Edge Function flow:
--     - call get_or_create_video_date_room()
--     - if room_url returned -> done
--     - if needs_creation true -> create room via Daily API, then UPDATE video_dates.daily_room_url
-- =============================================

BEGIN;

-- 1) Add columns to video_dates to persist room identity
ALTER TABLE public.video_dates
ADD COLUMN IF NOT EXISTS daily_room_name TEXT,
ADD COLUMN IF NOT EXISTS daily_room_url  TEXT,
ADD COLUMN IF NOT EXISTS daily_room_created_at TIMESTAMPTZ;

COMMENT ON COLUMN public.video_dates.daily_room_name IS
'Stable Daily room name reserved for this video date (shared by both participants). Example: vd_<video_date_id>.';

COMMENT ON COLUMN public.video_dates.daily_room_url IS
'Full Daily room URL (e.g., https://<your-domain>.daily.co/<room>). Source of truth for both participants to join the same room.';

COMMENT ON COLUMN public.video_dates.daily_room_created_at IS
'Timestamp when the Daily room URL was created and stored.';

-- 2) Prevent duplicates if you ever reuse names (should never happen, but safe)
CREATE UNIQUE INDEX IF NOT EXISTS uq_video_dates_daily_room_name
ON public.video_dates (daily_room_name)
WHERE daily_room_name IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_video_dates_daily_room_url
ON public.video_dates (daily_room_url)
WHERE daily_room_url IS NOT NULL;

-- Helpful index for lookup/join screens
CREATE INDEX IF NOT EXISTS idx_video_dates_daily_room_url
ON public.video_dates (daily_room_url);

-- 3) RPC: get_or_create_video_date_room(video_date_id)
-- Locks the row to prevent two clients creating two different rooms.
DROP FUNCTION IF EXISTS public.get_or_create_video_date_room(uuid);

CREATE OR REPLACE FUNCTION public.get_or_create_video_date_room(p_video_date_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_video_date record;
  v_room_name text;
BEGIN
  -- Must be authenticated
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Lock the video_date row to avoid double-create race conditions
  SELECT *
  INTO v_video_date
  FROM public.video_dates
  WHERE id = p_video_date_id
  FOR UPDATE;

  IF v_video_date IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Video date not found');
  END IF;

  -- Caller must be a participant
  IF auth.uid() <> v_video_date.seeker_id AND auth.uid() <> v_video_date.earner_id THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- If a room URL already exists, return it (both clients join same URL)
  IF v_video_date.daily_room_url IS NOT NULL THEN
    RETURN json_build_object(
      'success', true,
      'room_url', v_video_date.daily_room_url,
      'room_name', v_video_date.daily_room_name,
      'needs_creation', false
    );
  END IF;

  -- Reserve a stable shared room name if not present
  IF v_video_date.daily_room_name IS NULL THEN
    v_room_name := 'vd_' || p_video_date_id::text;

    UPDATE public.video_dates
    SET daily_room_name = v_room_name,
        updated_at = now()
    WHERE id = p_video_date_id;
  ELSE
    v_room_name := v_video_date.daily_room_name;
  END IF;

  -- We cannot create the Daily room from Postgres; return instructions for server-side creation
  RETURN json_build_object(
    'success', true,
    'room_url', NULL,
    'room_name', v_room_name,
    'needs_creation', true
  );
END;
$$;

COMMENT ON FUNCTION public.get_or_create_video_date_room(uuid) IS
'Returns the shared Daily room for a video date. Locks the video_dates row to prevent race conditions that create two separate rooms. If daily_room_url exists, returns it. Otherwise reserves a stable daily_room_name (vd_<video_date_id>) and returns needs_creation=true so server can create the room via Daily API and persist daily_room_url.';

-- 4) OPTIONAL: helper RPC for admins to set/repair a room_url manually
-- (Edge Functions using service_role bypass RLS anyway, so this is mostly for debugging.)
DROP FUNCTION IF EXISTS public.admin_set_video_date_room_url(uuid, text);

CREATE OR REPLACE FUNCTION public.admin_set_video_date_room_url(p_video_date_id uuid, p_room_url text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_video_date record;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Require admin role
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT *
  INTO v_video_date
  FROM public.video_dates
  WHERE id = p_video_date_id
  FOR UPDATE;

  IF v_video_date IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Video date not found');
  END IF;

  UPDATE public.video_dates
  SET daily_room_url = p_room_url,
      daily_room_created_at = now(),
      updated_at = now()
  WHERE id = p_video_date_id;

  RETURN json_build_object('success', true, 'room_url', p_room_url);
END;
$$;

COMMENT ON FUNCTION public.admin_set_video_date_room_url(uuid, text) IS
'Admin-only helper to set/repair daily_room_url for a video date. Edge functions using service_role can update directly without this.';

COMMIT;

-- ✅ After running this migration:
-- Client should NEVER create a Daily room name locally.
-- Both users should call:
--   supabase.rpc("get_or_create_video_date_room", { p_video_date_id: videoDateId })
-- Then join using returned room_url.
-- If needs_creation=true, call your Edge Function to:
--   - Create Daily room using room_name
--   - Update public.video_dates.daily_room_url
--   - Return room_url to client
-- =============================================================================
-- 1) Ensure enum value exists (safe across Postgres versions)
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'app_role'
      AND e.enumlabel = 'creator'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'creator';
  END IF;
END $$;

-- =============================================================================
-- 2) Ensure user_roles has a usable unique constraint for ON CONFLICT
--    (required for INSERT ... ON CONFLICT DO NOTHING)
-- =============================================================================
ALTER TABLE public.user_roles
  ADD CONSTRAINT IF NOT EXISTS user_roles_user_id_role_key UNIQUE (user_id, role);

-- =============================================================================
-- 3) Create creator_applications table (with constraints + FKs)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.creator_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  social_link TEXT,
  why_join TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Optional but recommended indexes
CREATE INDEX IF NOT EXISTS idx_creator_applications_status
  ON public.creator_applications(status);

CREATE INDEX IF NOT EXISTS idx_creator_applications_created_at
  ON public.creator_applications(created_at DESC);

-- =============================================================================
-- 4) RLS policies for creator_applications (FIXED enum casting)
-- =============================================================================
ALTER TABLE public.creator_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own applications" ON public.creator_applications;
CREATE POLICY "Users can view own applications"
  ON public.creator_applications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own applications" ON public.creator_applications;
CREATE POLICY "Users can create own applications"
  ON public.creator_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update pending applications" ON public.creator_applications;
CREATE POLICY "Users can update pending applications"
  ON public.creator_applications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS "Admins can view all applications" ON public.creator_applications;
CREATE POLICY "Admins can view all applications"
  ON public.creator_applications
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update applications" ON public.creator_applications;
CREATE POLICY "Admins can update applications"
  ON public.creator_applications
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- =============================================================================
-- 5) Cap status helper
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_creator_cap_status()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cap_limit INTEGER := 50;
  v_creator_count INTEGER;
  v_is_capped BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO v_creator_count
  FROM public.profiles p
  WHERE p.user_type = 'earner'
    AND p.account_status = 'active'
    AND p.verification_status = 'verified';

  v_is_capped := v_creator_count >= v_cap_limit;

  RETURN json_build_object(
    'current_count', v_creator_count,
    'limit', v_cap_limit,
    'is_capped', v_is_capped,
    'spots_remaining', GREATEST(0, v_cap_limit - v_creator_count)
  );
END;
$$;

-- =============================================================================
-- 6) Approve / reject functions (FIXED enum casting + safer updates)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.approve_creator_application(p_application_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_application public.creator_applications%ROWTYPE;
  v_cap_status JSON;
BEGIN
  -- Verify admin role (enum cast)
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  v_cap_status := public.get_creator_cap_status();
  IF (v_cap_status->>'is_capped')::BOOLEAN THEN
    RETURN json_build_object('success', false, 'error', 'Creator cap reached (50/50). Cannot approve more creators.');
  END IF;

  -- Lock + fetch pending application
  SELECT * INTO v_application
  FROM public.creator_applications
  WHERE id = p_application_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Application not found or already processed');
  END IF;

  -- Update application
  UPDATE public.creator_applications
  SET status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_application_id;

  -- Update profile
  UPDATE public.profiles
  SET user_type = 'earner',
      account_status = 'active',
      updated_at = now()
  WHERE id = v_application.user_id;

  -- Add creator role (enum cast)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_application.user_id, 'creator'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN json_build_object('success', true, 'message', 'Creator application approved');
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_creator_application(
  p_application_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_application public.creator_applications%ROWTYPE;
BEGIN
  -- Verify admin role (enum cast)
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT * INTO v_application
  FROM public.creator_applications
  WHERE id = p_application_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Application not found or already processed');
  END IF;

  UPDATE public.creator_applications
  SET status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_notes = p_reason,
      updated_at = now()
  WHERE id = p_application_id;

  RETURN json_build_object('success', true, 'message', 'Creator application rejected');
END;
$$;

-- =============================================================================
-- 7) Trigger to enforce creator cap on direct profile updates
-- =============================================================================
CREATE OR REPLACE FUNCTION public.enforce_creator_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cap_status JSON;
BEGIN
  IF NEW.user_type = 'earner' AND (OLD.user_type IS NULL OR OLD.user_type != 'earner') THEN
    v_cap_status := public.get_creator_cap_status();
    IF (v_cap_status->>'is_capped')::BOOLEAN THEN
      RAISE EXCEPTION 'Creator cap reached. Applications required.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_creator_cap ON public.profiles;
CREATE TRIGGER check_creator_cap
  BEFORE UPDATE OF user_type ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_creator_cap();
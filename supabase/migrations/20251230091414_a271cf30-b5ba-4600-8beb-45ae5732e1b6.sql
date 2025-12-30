-- Add 'creator' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'creator';

-- Create creator_applications table
CREATE TABLE public.creator_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  social_link TEXT,
  why_join TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.creator_applications ENABLE ROW LEVEL SECURITY;

-- Users can view own applications
CREATE POLICY "Users can view own applications"
  ON public.creator_applications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create own applications
CREATE POLICY "Users can create own applications"
  ON public.creator_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update own applications (before review)
CREATE POLICY "Users can update pending applications"
  ON public.creator_applications FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

-- Admins can manage all applications
CREATE POLICY "Admins can view all applications"
  ON public.creator_applications FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update applications"
  ON public.creator_applications FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create get_creator_cap_status function
CREATE OR REPLACE FUNCTION public.get_creator_cap_status()
RETURNS JSON
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cap_limit INTEGER := 50;
  v_creator_count INTEGER;
  v_is_capped BOOLEAN;
BEGIN
  -- Count active earners
  SELECT COUNT(*) INTO v_creator_count
  FROM profiles p
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

-- Create approve_creator_application function
CREATE OR REPLACE FUNCTION public.approve_creator_application(p_application_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_application RECORD;
  v_cap_status JSON;
  v_is_capped BOOLEAN;
BEGIN
  -- Verify admin role
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  
  -- Check cap status
  v_cap_status := public.get_creator_cap_status();
  v_is_capped := (v_cap_status->>'is_capped')::BOOLEAN;
  
  IF v_is_capped THEN
    RETURN json_build_object('success', false, 'error', 'Creator cap reached (50/50). Cannot approve more creators.');
  END IF;
  
  -- Get application
  SELECT * INTO v_application
  FROM creator_applications
  WHERE id = p_application_id AND status = 'pending';
  
  IF v_application IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Application not found or already processed');
  END IF;
  
  -- Update application status
  UPDATE creator_applications
  SET status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_application_id;
  
  -- Update user profile to earner with active status
  UPDATE profiles
  SET user_type = 'earner',
      account_status = 'active',
      updated_at = now()
  WHERE id = v_application.user_id;
  
  -- Add creator role
  INSERT INTO user_roles (user_id, role)
  VALUES (v_application.user_id, 'creator')
  ON CONFLICT DO NOTHING;
  
  RETURN json_build_object('success', true, 'message', 'Creator application approved');
END;
$$;

-- Create reject_creator_application function
CREATE OR REPLACE FUNCTION public.reject_creator_application(p_application_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_application RECORD;
BEGIN
  -- Verify admin role
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  
  -- Get application
  SELECT * INTO v_application
  FROM creator_applications
  WHERE id = p_application_id AND status = 'pending';
  
  IF v_application IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Application not found or already processed');
  END IF;
  
  -- Update application status
  UPDATE creator_applications
  SET status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_notes = p_reason,
      updated_at = now()
  WHERE id = p_application_id;
  
  RETURN json_build_object('success', true, 'message', 'Creator application rejected');
END;
$$;

-- Create trigger to enforce creator cap on direct profile updates
CREATE OR REPLACE FUNCTION public.enforce_creator_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cap_status JSON;
BEGIN
  -- Only check when user_type is being set to 'earner' from non-earner
  IF NEW.user_type = 'earner' AND (OLD.user_type IS NULL OR OLD.user_type != 'earner') THEN
    v_cap_status := public.get_creator_cap_status();
    IF (v_cap_status->>'is_capped')::BOOLEAN THEN
      RAISE EXCEPTION 'Creator cap reached. Applications required.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_creator_cap
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION enforce_creator_cap();
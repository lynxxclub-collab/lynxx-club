-- Create account_type_switches table
CREATE TABLE public.account_type_switches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_type TEXT NOT NULL CHECK (from_type IN ('seeker', 'earner')),
  to_type TEXT NOT NULL CHECK (to_type IN ('seeker', 'earner')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed'))
);

-- Add unique constraint on user_id (only one pending switch at a time)
ALTER TABLE public.account_type_switches ADD CONSTRAINT account_type_switches_user_id_key UNIQUE (user_id);

-- Enable RLS
ALTER TABLE public.account_type_switches ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own switches"
  ON public.account_type_switches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own switches"
  ON public.account_type_switches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own switches"
  ON public.account_type_switches FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all switches"
  ON public.account_type_switches FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Create RPC function to check account switch status
CREATE OR REPLACE FUNCTION public.check_account_switch()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending_switch JSONB;
  v_can_switch BOOLEAN;
BEGIN
  -- Check for pending switch
  SELECT jsonb_build_object(
    'id', id,
    'from_type', from_type,
    'to_type', to_type,
    'requested_at', requested_at,
    'effective_at', effective_at,
    'status', status
  ) INTO v_pending_switch
  FROM public.account_type_switches
  WHERE user_id = auth.uid()
    AND status = 'pending';
  
  -- User can switch if no pending switch exists
  v_can_switch := v_pending_switch IS NULL;
  
  RETURN json_build_object(
    'can_switch', v_can_switch,
    'pending_switch', v_pending_switch
  );
END;
$$;
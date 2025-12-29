-- Create launch_signups table
CREATE TABLE public.launch_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type TEXT NOT NULL CHECK (user_type IN ('seeker', 'earner')),
  signup_number INTEGER NOT NULL,
  claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, user_type)
);

-- Enable RLS
ALTER TABLE public.launch_signups ENABLE ROW LEVEL SECURITY;

-- Users can view their own signups
CREATE POLICY "Users can view their own signups"
ON public.launch_signups
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own signups
CREATE POLICY "Users can insert their own signups"
ON public.launch_signups
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all signups
CREATE POLICY "Admins can view all signups"
ON public.launch_signups
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create function to get signup counts
CREATE OR REPLACE FUNCTION public.get_launch_signup_counts()
RETURNS TABLE (seeker_count INTEGER, earner_count INTEGER)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE((SELECT COUNT(*)::INTEGER FROM public.launch_signups WHERE user_type = 'seeker'), 0) as seeker_count,
    COALESCE((SELECT COUNT(*)::INTEGER FROM public.launch_signups WHERE user_type = 'earner'), 0) as earner_count;
$$;
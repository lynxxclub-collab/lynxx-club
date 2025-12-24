-- Create launch_promotions table
CREATE TABLE public.launch_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  user_type TEXT NOT NULL,
  promotion_type TEXT NOT NULL,
  bonus_credits INTEGER DEFAULT 0,
  featured_until TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.launch_promotions ENABLE ROW LEVEL SECURITY;

-- Users can view their own promotions
CREATE POLICY "Users can view their own promotions"
ON public.launch_promotions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can claim promotions for themselves
CREATE POLICY "Users can claim promotions"
ON public.launch_promotions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all promotions
CREATE POLICY "Admins can view all promotions"
ON public.launch_promotions
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Index for tracking promotion claims
CREATE INDEX idx_launch_promotions_type ON public.launch_promotions(promotion_type, claimed_at);
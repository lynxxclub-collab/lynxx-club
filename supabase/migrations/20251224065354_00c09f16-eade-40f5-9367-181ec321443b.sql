-- Create success_stories table
CREATE TABLE public.success_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  partner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_partner_confirmation',
  how_met TEXT,
  story_text TEXT NOT NULL,
  partner_confirmation_expires_at TIMESTAMPTZ NOT NULL,
  partner_confirmed_at TIMESTAMPTZ,
  initiator_survey_completed BOOLEAN DEFAULT false,
  partner_survey_completed BOOLEAN DEFAULT false,
  gift_cards_sent BOOLEAN DEFAULT false,
  alumni_access_granted BOOLEAN DEFAULT false,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.success_stories ENABLE ROW LEVEL SECURITY;

-- Policies for success_stories
CREATE POLICY "Users can view stories they're part of"
ON public.success_stories
FOR SELECT
USING (auth.uid() = initiator_id OR auth.uid() = partner_id);

CREATE POLICY "Users can create stories"
ON public.success_stories
FOR INSERT
WITH CHECK (auth.uid() = initiator_id);

CREATE POLICY "Involved users can update stories"
ON public.success_stories
FOR UPDATE
USING (auth.uid() = initiator_id OR auth.uid() = partner_id);

-- Create fraud_flags table
CREATE TABLE public.fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  flag_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  reason TEXT NOT NULL,
  details JSONB,
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fraud_flags ENABLE ROW LEVEL SECURITY;

-- Only admins can view fraud flags (using has_role function)
CREATE POLICY "Admins can view fraud flags"
ON public.fraud_flags
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- System can insert fraud flags (via service role)
CREATE POLICY "Service role can insert fraud flags"
ON public.fraud_flags
FOR INSERT
WITH CHECK (true);

-- Indexes
CREATE INDEX idx_success_stories_initiator ON public.success_stories(initiator_id);
CREATE INDEX idx_success_stories_partner ON public.success_stories(partner_id);
CREATE INDEX idx_success_stories_status ON public.success_stories(status);
CREATE INDEX idx_fraud_flags_user ON public.fraud_flags(user_id);
CREATE INDEX idx_fraud_flags_severity ON public.fraud_flags(severity);
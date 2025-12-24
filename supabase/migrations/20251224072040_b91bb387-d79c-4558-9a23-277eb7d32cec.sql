-- Add review columns to success_stories
ALTER TABLE public.success_stories
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reviewed_by UUID,
ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- Create scheduled_gift_cards table
CREATE TABLE IF NOT EXISTS public.scheduled_gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  success_story_id UUID REFERENCES public.success_stories(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.scheduled_gift_cards ENABLE ROW LEVEL SECURITY;

-- Admin-only policies for scheduled_gift_cards
CREATE POLICY "Admins can view scheduled gift cards"
ON public.scheduled_gift_cards
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert scheduled gift cards"
ON public.scheduled_gift_cards
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update scheduled gift cards"
ON public.scheduled_gift_cards
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Create index
CREATE INDEX IF NOT EXISTS idx_scheduled_gift_cards_status ON public.scheduled_gift_cards(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_gift_cards_scheduled_for ON public.scheduled_gift_cards(scheduled_for);
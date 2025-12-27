-- Create nudge_events table for tracking smart nudges
CREATE TABLE public.nudge_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  nudge_type TEXT NOT NULL CHECK (nudge_type IN ('image_unlock', 'video_unlock', 'online_availability', 'low_credits')),
  shown_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  clicked_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  purchased_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.nudge_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for nudge_events
CREATE POLICY "Users can view their own nudge events"
ON public.nudge_events FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own nudge events"
ON public.nudge_events FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own nudge events"
ON public.nudge_events FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for efficient queries
CREATE INDEX idx_nudge_events_conversation ON public.nudge_events(conversation_id);
CREATE INDEX idx_nudge_events_user ON public.nudge_events(user_id);

-- Enable realtime for nudge_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.nudge_events;
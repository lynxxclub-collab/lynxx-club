-- Create video_dates table
CREATE TABLE public.video_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id),
  seeker_id UUID NOT NULL,
  earner_id UUID NOT NULL,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_duration INTEGER NOT NULL CHECK (scheduled_duration IN (30, 60)),
  credits_reserved INTEGER NOT NULL,
  earner_amount NUMERIC(10, 2) NOT NULL,
  platform_fee NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.video_dates ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their video dates" ON public.video_dates
FOR SELECT USING (auth.uid() = seeker_id OR auth.uid() = earner_id);

CREATE POLICY "Seekers can create video dates" ON public.video_dates
FOR INSERT WITH CHECK (auth.uid() = seeker_id);

CREATE POLICY "Users can update their video dates" ON public.video_dates
FOR UPDATE USING (auth.uid() = seeker_id OR auth.uid() = earner_id);

-- Index for checking conflicts
CREATE INDEX idx_video_dates_earner_scheduled ON public.video_dates(earner_id, scheduled_start, status);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_dates;
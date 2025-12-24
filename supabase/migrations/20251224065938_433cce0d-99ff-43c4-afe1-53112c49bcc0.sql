-- Add fraud detection columns to success_stories
ALTER TABLE public.success_stories
ADD COLUMN IF NOT EXISTS fraud_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS fraud_risk TEXT,
ADD COLUMN IF NOT EXISTS fraud_flags JSONB;

-- Create index for fraud risk filtering
CREATE INDEX IF NOT EXISTS idx_success_stories_fraud_risk ON public.success_stories(fraud_risk);
CREATE INDEX IF NOT EXISTS idx_success_stories_fraud_score ON public.success_stories(fraud_score);
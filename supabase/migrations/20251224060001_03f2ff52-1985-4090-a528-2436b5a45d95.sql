-- Add pending_balance to profiles for pending earnings
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS pending_balance NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT false;

-- Create withdrawals table
CREATE TABLE public.withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 20),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  stripe_transfer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- Withdrawal policies
CREATE POLICY "Users can view their own withdrawals"
ON public.withdrawals FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own withdrawals"
ON public.withdrawals FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawals;

-- Create index
CREATE INDEX idx_withdrawals_user ON public.withdrawals(user_id);
CREATE INDEX idx_withdrawals_created ON public.withdrawals(created_at DESC);
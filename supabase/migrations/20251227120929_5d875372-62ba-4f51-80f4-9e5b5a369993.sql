-- Create credit_packs table
CREATE TABLE public.credit_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  credits integer NOT NULL,
  price_cents integer NOT NULL,
  stripe_price_id text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on credit_packs (public read, no client writes)
ALTER TABLE public.credit_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active credit packs" ON public.credit_packs
  FOR SELECT USING (active = true);

-- Create wallets table
CREATE TABLE public.wallets (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  credit_balance integer NOT NULL DEFAULT 0,
  pending_earnings numeric(10,2) NOT NULL DEFAULT 0,
  available_earnings numeric(10,2) NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- RLS: Users can SELECT own wallet only, NO client-side writes
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own wallet" ON public.wallets
  FOR SELECT USING (auth.uid() = user_id);

-- Create ledger_entries table
CREATE TABLE public.ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  entry_type text NOT NULL CHECK (entry_type IN ('credit_purchase', 'volley_spend', 'platform_fee', 'provider_earning', 'withdrawal')),
  credits_delta integer DEFAULT 0,
  usd_delta numeric(10,2) DEFAULT 0,
  reference_id uuid,
  reference_type text,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ledger_user_created ON public.ledger_entries(user_id, created_at DESC);

-- RLS: Users can SELECT own entries only, NO client-side writes
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own ledger" ON public.ledger_entries
  FOR SELECT USING (auth.uid() = user_id);

-- Add payer_user_id to conversations
ALTER TABLE public.conversations 
  ADD COLUMN IF NOT EXISTS payer_user_id uuid REFERENCES public.profiles(id);

-- Add volley billing columns to messages
ALTER TABLE public.messages 
  ADD COLUMN IF NOT EXISTS is_billable_volley boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS billed_at timestamptz;

-- Create index for finding unbilled payer messages
CREATE INDEX idx_messages_billable ON public.messages(conversation_id, sender_id, created_at) 
  WHERE billed_at IS NULL;

-- Create function to auto-create wallet on profile creation
CREATE OR REPLACE FUNCTION public.create_wallet_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wallets (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-create wallet
CREATE TRIGGER on_profile_created_create_wallet
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_wallet_for_new_user();

-- Enable realtime for wallets
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
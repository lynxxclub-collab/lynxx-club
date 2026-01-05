BEGIN;

-- 1) Wallet fields (adapt if you already have these)
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS credits_balance integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS earnings_credits_pending integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS earnings_credits_available integer NOT NULL DEFAULT 0;

-- 2) Ledger of every credit movement (source of truth)
CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),

  video_date_id uuid NULL,
  message_id uuid NULL,

  seeker_id uuid NOT NULL,
  earner_id uuid NOT NULL,

  -- amount seeker pays (credits)
  credits_total integer NOT NULL,

  -- split
  credits_to_earner integer NOT NULL,
  credits_platform_fee integer NOT NULL,

  -- type
  kind text NOT NULL CHECK (kind IN ('video', 'message')),

  UNIQUE (video_date_id, kind) -- prevents double charge per call (video)
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_seeker ON public.credit_ledger(seeker_id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_earner ON public.credit_ledger(earner_id);

COMMIT;
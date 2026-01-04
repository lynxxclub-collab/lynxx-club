-- =============================================================================
-- SEED PLATFORM SETTINGS WITH AUTHORITATIVE PRICING RATES (jsonb NUMBERS)
-- =============================================================================

-- Assumes: platform_settings(key text primary key, value jsonb, updated_at timestamptz)
INSERT INTO public.platform_settings (key, value)
VALUES
  ('credit_to_usd_rate', to_jsonb(0.10)),
  ('creator_share_rate', to_jsonb(0.70)),
  ('platform_share_rate', to_jsonb(0.30))
ON CONFLICT (key)
DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();

-- =============================================================================
-- HELPER: SINGLE SOURCE OF TRUTH EARNINGS CALC
-- =============================================================================

CREATE OR REPLACE FUNCTION public.calculate_earnings(p_credits integer)
RETURNS TABLE (
  gross_usd numeric,
  creator_usd numeric,
  platform_usd numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credit_rate numeric;
  v_creator_rate numeric;
BEGIN
  -- Pull settings (value is jsonb NUMBER now)
  SELECT (value)::text::numeric
    INTO v_credit_rate
  FROM public.platform_settings
  WHERE key = 'credit_to_usd_rate';

  SELECT (value)::text::numeric
    INTO v_creator_rate
  FROM public.platform_settings
  WHERE key = 'creator_share_rate';

  -- Defaults if missing
  v_credit_rate := COALESCE(v_credit_rate, 0.10);
  v_creator_rate := COALESCE(v_creator_rate, 0.70);

  gross_usd := ROUND(p_credits * v_credit_rate, 2);
  creator_usd := ROUND(gross_usd * v_creator_rate, 2);
  platform_usd := gross_usd - creator_usd;

  RETURN NEXT;
END;
$$;

-- =============================================================================
-- TRIGGER: VALIDATE GIFT TRANSACTION PRICING (USES calculate_earnings)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.validate_gift_pricing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_usd numeric;
BEGIN
  -- Only validate when credits_spent is present/positive
  IF NEW.credits_spent IS NULL OR NEW.credits_spent <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT creator_usd
    INTO v_creator_usd
  FROM public.calculate_earnings(NEW.credits_spent);

  -- 1 cent tolerance for rounding
  IF NEW.earner_amount IS NULL OR ABS(NEW.earner_amount - v_creator_usd) > 0.01 THEN
    RAISE EXCEPTION
      'Invalid earner_amount: expected %, got % (credits_spent=%)',
      v_creator_usd, NEW.earner_amount, NEW.credits_spent;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_gift_pricing_trigger ON public.gift_transactions;

CREATE TRIGGER validate_gift_pricing_trigger
BEFORE INSERT OR UPDATE ON public.gift_transactions
FOR EACH ROW
EXECUTE FUNCTION public.validate_gift_pricing();

-- =============================================================================
-- TRIGGER: VALIDATE MESSAGE PRICING (USES calculate_earnings)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.validate_message_pricing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_usd numeric;
BEGIN
  -- Only validate if message has credits charged
  IF NEW.credits_cost IS NULL OR NEW.credits_cost <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT creator_usd
    INTO v_creator_usd
  FROM public.calculate_earnings(NEW.credits_cost);

  IF NEW.earner_amount IS NULL OR ABS(NEW.earner_amount - v_creator_usd) > 0.01 THEN
    RAISE EXCEPTION
      'Invalid earner_amount: expected %, got % (credits_cost=%)',
      v_creator_usd, NEW.earner_amount, NEW.credits_cost;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_message_pricing_trigger ON public.messages;

CREATE TRIGGER validate_message_pricing_trigger
BEFORE INSERT OR UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.validate_message_pricing();
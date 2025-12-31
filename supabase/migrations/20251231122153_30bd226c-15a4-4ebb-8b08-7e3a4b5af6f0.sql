-- =============================================================================
-- SEED PLATFORM SETTINGS WITH AUTHORITATIVE PRICING RATES
-- =============================================================================

INSERT INTO platform_settings (key, value) VALUES
  ('credit_to_usd_rate', '"0.10"'),
  ('creator_share_rate', '"0.70"'),
  ('platform_share_rate', '"0.30"')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- =============================================================================
-- CREATE HELPER FUNCTION TO CALCULATE EARNINGS (SINGLE SOURCE OF TRUTH)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.calculate_earnings(p_credits INTEGER)
RETURNS TABLE(
  gross_usd NUMERIC,
  creator_usd NUMERIC,
  platform_usd NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_credit_rate NUMERIC;
  v_creator_rate NUMERIC;
BEGIN
  -- Get rates from platform_settings (single source of truth)
  SELECT (value #>> '{}')::NUMERIC INTO v_credit_rate 
  FROM platform_settings WHERE key = 'credit_to_usd_rate';
  
  SELECT (value #>> '{}')::NUMERIC INTO v_creator_rate 
  FROM platform_settings WHERE key = 'creator_share_rate';
  
  -- Default to standard rates if not set
  v_credit_rate := COALESCE(v_credit_rate, 0.10);
  v_creator_rate := COALESCE(v_creator_rate, 0.70);
  
  gross_usd := ROUND(p_credits * v_credit_rate, 2);
  creator_usd := ROUND(gross_usd * v_creator_rate, 2);
  platform_usd := gross_usd - creator_usd; -- Remainder to platform
  
  RETURN NEXT;
END;
$$;

-- =============================================================================
-- CREATE VALIDATION TRIGGER FOR GIFT TRANSACTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.validate_gift_pricing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  expected_creator_usd NUMERIC;
BEGIN
  -- Calculate expected creator earnings: credits × 0.10 × 0.70
  expected_creator_usd := ROUND(NEW.credits_spent * 0.10 * 0.70, 2);
  
  -- Allow 1 cent tolerance for rounding
  IF ABS(NEW.earner_amount - expected_creator_usd) > 0.01 THEN
    RAISE EXCEPTION 'Invalid earner_amount: expected %, got %', 
      expected_creator_usd, NEW.earner_amount;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists, then create
DROP TRIGGER IF EXISTS validate_gift_pricing_trigger ON gift_transactions;

CREATE TRIGGER validate_gift_pricing_trigger
  BEFORE INSERT ON gift_transactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_gift_pricing();

-- =============================================================================
-- CREATE VALIDATION TRIGGER FOR MESSAGES
-- =============================================================================

CREATE OR REPLACE FUNCTION public.validate_message_pricing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  expected_earner_amount NUMERIC;
BEGIN
  -- Only validate if message has credits charged
  IF NEW.credits_cost > 0 THEN
    -- Calculate expected earner amount: credits × 0.10 × 0.70
    expected_earner_amount := ROUND(NEW.credits_cost * 0.10 * 0.70, 2);
    
    -- Allow 1 cent tolerance for rounding
    IF ABS(NEW.earner_amount - expected_earner_amount) > 0.01 THEN
      RAISE EXCEPTION 'Invalid earner_amount: expected %, got %', 
        expected_earner_amount, NEW.earner_amount;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists, then create
DROP TRIGGER IF EXISTS validate_message_pricing_trigger ON messages;

CREATE TRIGGER validate_message_pricing_trigger
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION validate_message_pricing();
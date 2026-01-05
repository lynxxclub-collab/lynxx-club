-- Migration: 20260104_03_create_complete_video_date_function
-- Description: Creates function to safely complete video dates with validation

CREATE OR REPLACE FUNCTION complete_video_date(
  p_video_date_id UUID,
  p_actual_end TIMESTAMPTZ,
  p_both_joined BOOLEAN,
  p_call_connected BOOLEAN
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_video_date RECORD;
  v_actual_duration INTEGER;
  v_credits_to_charge DECIMAL;
  v_earner_payout DECIMAL;
  v_platform_fee DECIMAL;
  v_result JSON;
BEGIN
  -- Get the video date with lock to prevent race conditions
  SELECT * INTO v_video_date
  FROM video_dates
  WHERE id = p_video_date_id
  FOR UPDATE;

  -- Validation: Check if video date exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Video date not found'
    );
  END IF;

  -- Validation: Prevent double processing
  IF v_video_date.completion_verified = true THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Video date already processed',
      'already_charged', true
    );
  END IF;

  -- Validation: Must have actual_start to complete
  IF v_video_date.actual_start IS NULL THEN
    -- Call never started, just cancel and refund
    UPDATE video_dates
    SET 
      status = 'cancelled',
      completion_verified = true,
      failure_reason = 'Call never started'
    WHERE id = p_video_date_id;

    -- Release reserved credits
    PERFORM release_credit_reservation(p_video_date_id);

    RETURN json_build_object(
      'success', true,
      'action', 'refunded',
      'reason', 'Call never started'
    );
  END IF;

  -- Calculate actual duration in minutes
  v_actual_duration := EXTRACT(EPOCH FROM (p_actual_end - v_video_date.actual_start)) / 60;
  v_actual_duration := GREATEST(0, FLOOR(v_actual_duration)); -- Round down, minimum 0

  -- Validation: Both participants must have joined for charging
  IF NOT p_both_joined OR NOT p_call_connected THEN
    -- Call failed to connect properly, refund all credits
    UPDATE video_dates
    SET 
      status = 'cancelled',
      actual_end = p_actual_end,
      actual_duration = v_actual_duration,
      call_connected = p_call_connected,
      both_joined = p_both_joined,
      completion_verified = true,
      failure_reason = CASE 
        WHEN NOT p_call_connected THEN 'Call failed to connect'
        WHEN NOT p_both_joined THEN 'Not all participants joined'
        ELSE 'Unknown failure'
      END
    WHERE id = p_video_date_id;

    -- Release reserved credits (full refund)
    PERFORM release_credit_reservation(p_video_date_id);

    RETURN json_build_object(
      'success', true,
      'action', 'refunded',
      'reason', CASE 
        WHEN NOT p_call_connected THEN 'Call failed to connect'
        WHEN NOT p_both_joined THEN 'Not all participants joined'
      END
    );
  END IF;

  -- Calculate credits to charge based on actual duration
  -- Use prorated amount based on actual time used
  IF v_actual_duration = 0 THEN
    -- Call connected but ended immediately (< 1 minute), minimal charge
    v_credits_to_charge := v_video_date.credits_per_minute; -- Charge for 1 minute minimum
    v_actual_duration := 1;
  ELSIF v_actual_duration > v_video_date.scheduled_duration THEN
    -- Call went over time, cap at scheduled duration
    v_credits_to_charge := v_video_date.credits_reserved;
    v_actual_duration := v_video_date.scheduled_duration;
  ELSE
    -- Normal case: charge for actual time used
    v_credits_to_charge := v_video_date.credits_per_minute * v_actual_duration;
  END IF;

  -- Calculate platform fee and earner payout
  v_platform_fee := v_credits_to_charge * 0.20; -- 20% platform fee
  v_earner_payout := v_credits_to_charge - v_platform_fee;

  -- Update video date with completion details
  UPDATE video_dates
  SET 
    status = 'completed',
    actual_end = p_actual_end,
    actual_duration = v_actual_duration,
    call_connected = true,
    both_joined = true,
    completion_verified = true,
    earner_amount = v_earner_payout,
    platform_fee = v_platform_fee
  WHERE id = p_video_date_id;

  -- Charge the actual credits used (not the full reservation)
  -- This is done by the credit reservation release function
  PERFORM finalize_credit_charge(
    p_video_date_id := p_video_date_id,
    p_actual_credits := v_credits_to_charge
  );

  -- Add credits to earner's wallet
  UPDATE wallets
  SET credit_balance = credit_balance + v_earner_payout
  WHERE user_id = v_video_date.earner_id;

  RETURN json_build_object(
    'success', true,
    'action', 'completed',
    'actual_duration', v_actual_duration,
    'credits_charged', v_credits_to_charge,
    'credits_reserved', v_video_date.credits_reserved,
    'credits_refunded', v_video_date.credits_reserved - v_credits_to_charge,
    'earner_payout', v_earner_payout,
    'platform_fee', v_platform_fee
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION complete_video_date TO authenticated;

COMMENT ON FUNCTION complete_video_date IS 'Safely completes a video date with validation and proper credit charging based on actual usage';
-- Migration: 20260104_04_create_finalize_credit_charge_function
-- Description: Creates function to charge actual credits used and refund the difference

CREATE OR REPLACE FUNCTION finalize_credit_charge(
  p_video_date_id UUID,
  p_actual_credits DECIMAL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_video_date RECORD;
  v_reservation RECORD;
  v_credits_to_refund DECIMAL;
BEGIN
  -- Get video date details
  SELECT * INTO v_video_date
  FROM video_dates
  WHERE id = p_video_date_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Video date not found'
    );
  END IF;

  -- Get the credit reservation
  SELECT * INTO v_reservation
  FROM credit_reservations
  WHERE video_date_id = p_video_date_id
  AND status = 'reserved'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No active reservation found'
    );
  END IF;

  -- Calculate credits to refund
  v_credits_to_refund := v_reservation.amount - p_actual_credits;
  v_credits_to_refund := GREATEST(0, v_credits_to_refund); -- Can't be negative

  -- Update reservation status to charged
  UPDATE credit_reservations
  SET 
    status = 'charged',
    charged_amount = p_actual_credits,
    refunded_amount = v_credits_to_refund,
    charged_at = NOW()
  WHERE id = v_reservation.id;

  -- Refund the unused credits back to seeker
  IF v_credits_to_refund > 0 THEN
    UPDATE wallets
    SET credit_balance = credit_balance + v_credits_to_refund
    WHERE user_id = v_video_date.seeker_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'reserved', v_reservation.amount,
    'charged', p_actual_credits,
    'refunded', v_credits_to_refund
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
GRANT EXECUTE ON FUNCTION finalize_credit_charge TO authenticated;

COMMENT ON FUNCTION finalize_credit_charge IS 'Finalizes credit charge by charging actual amount used and refunding the difference';
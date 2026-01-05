-- Migration: 20260104_05_create_credit_reservations_table
-- Description: Creates table to track credit reservations separately from charges

CREATE TABLE IF NOT EXISTS credit_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_date_id UUID NOT NULL REFERENCES video_dates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL NOT NULL,
  charged_amount DECIMAL DEFAULT 0,
  refunded_amount DECIMAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'charged', 'released', 'failed')),
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  charged_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_credit_reservations_video_date 
ON credit_reservations(video_date_id);

CREATE INDEX IF NOT EXISTS idx_credit_reservations_user 
ON credit_reservations(user_id);

CREATE INDEX IF NOT EXISTS idx_credit_reservations_status 
ON credit_reservations(status) 
WHERE status = 'reserved';

-- Enable RLS
ALTER TABLE credit_reservations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own reservations"
ON credit_reservations
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all reservations"
ON credit_reservations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add comments
COMMENT ON TABLE credit_reservations IS 'Tracks credit reservations for video dates to prevent double-charging';
COMMENT ON COLUMN credit_reservations.amount IS 'Amount of credits reserved';
COMMENT ON COLUMN credit_reservations.charged_amount IS 'Amount actually charged based on usage';
COMMENT ON COLUMN credit_reservations.refunded_amount IS 'Amount refunded (reserved - charged)';
COMMENT ON COLUMN credit_reservations.status IS 'Reservation status: reserved, charged, released, or failed';

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_credit_reservations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER credit_reservations_updated_at
BEFORE UPDATE ON credit_reservations
FOR EACH ROW
EXECUTE FUNCTION update_credit_reservations_updated_at();
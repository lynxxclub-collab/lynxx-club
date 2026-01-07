-- 1️⃣ Add the column
ALTER TABLE alumni_stats
ADD COLUMN IF NOT EXISTS alumni_days_remaining INTEGER;

-- 2️⃣ Function to calculate remaining days
CREATE OR REPLACE FUNCTION calculate_alumni_days_remaining()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.alumni_expires_at IS NULL THEN
    NEW.alumni_days_remaining := 0;
  ELSE
    NEW.alumni_days_remaining :=
      GREATEST(
        0,
        CEIL(EXTRACT(EPOCH FROM (NEW.alumni_expires_at - NOW())) / 86400)
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3️⃣ Trigger to auto-update on insert or update
DROP TRIGGER IF EXISTS trg_calculate_alumni_days_remaining ON alumni_stats;

CREATE TRIGGER trg_calculate_alumni_days_remaining
BEFORE INSERT OR UPDATE OF alumni_expires_at
ON alumni_stats
FOR EACH ROW
EXECUTE FUNCTION calculate_alumni_days_remaining();

-- 4️⃣ Backfill existing rows
UPDATE alumni_stats
SET alumni_days_remaining =
  GREATEST(
    0,
    CEIL(EXTRACT(EPOCH FROM (alumni_expires_at - NOW())) / 86400)
  )
WHERE alumni_expires_at IS NOT NULL;

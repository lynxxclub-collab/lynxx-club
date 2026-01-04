-- =============================================================================
-- Normalize and expand allowed transaction types
-- =============================================================================

-- Drop existing constraint safely
ALTER TABLE public.transactions
DROP CONSTRAINT IF EXISTS transactions_transaction_type_check;

-- Recreate with full, authoritative list
ALTER TABLE public.transactions
ADD CONSTRAINT transactions_transaction_type_check
CHECK (
  transaction_type = ANY (ARRAY[
    -- Credits
    'credit_purchase',
    'refund',

    -- Messaging
    'message_sent',
    'message_refund',
    'image_unlock',

    -- Gifts
    'gift_sent',
    'gift_received',

    -- Video dates
    'video_date',
    'video_earning',
    'video_date_reservation',
    'video_date_refund',

    -- Legacy / compatibility (keep for safety)
    'earning',
    'video_call',
    'image_request'
  ]::text[])
);
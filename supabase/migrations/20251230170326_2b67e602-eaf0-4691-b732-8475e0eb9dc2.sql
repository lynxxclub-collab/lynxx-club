-- Drop the existing check constraint
ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_transaction_type_check;

-- Add new constraint with all valid transaction types
ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_transaction_type_check 
CHECK (transaction_type = ANY (ARRAY[
  'credit_purchase'::text,
  'message_sent'::text,
  'video_call'::text,
  'image_request'::text,
  'refund'::text,
  'earning'::text,
  'gift_sent'::text,
  'gift_received'::text,
  'image_unlock'::text,
  'message_refund'::text,
  'video_date'::text,
  'video_earning'::text,
  'video_date_reservation'::text,
  'video_date_refund'::text
]));
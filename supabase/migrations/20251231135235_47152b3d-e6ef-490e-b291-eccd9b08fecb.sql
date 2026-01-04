-- ==========================================================
-- Fix search_path security warning for notify_new_message
-- ==========================================================

-- 1) Create or replace the function safely
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name text;
  v_notification_message text;
BEGIN
  -- Get sender name safely
  SELECT COALESCE(p.name, 'Someone')
  INTO v_sender_name
  FROM public.profiles p
  WHERE p.id = NEW.sender_id;

  -- Fallback if no profile row exists
  IF v_sender_name IS NULL THEN
    v_sender_name := 'Someone';
  END IF;

  -- Set notification message based on message type
  IF NEW.message_type = 'image' THEN
    v_notification_message := '📷 Image';
  ELSE
    v_notification_message := LEFT(COALESCE(NEW.content, ''), 100);
  END IF;

  -- Insert notification
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    related_id,
    related_type
  )
  VALUES (
    NEW.recipient_id,
    'new_message',
    v_sender_name || ' sent you a message',
    v_notification_message,
    NEW.conversation_id,
    'conversation'
  );

  RETURN NEW;
END;
$$;

-- 2) Drop existing trigger (prevents duplicates)
DROP TRIGGER IF EXISTS trg_notify_new_message ON public.messages;

-- 3) Recreate trigger
CREATE TRIGGER trg_notify_new_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_message();
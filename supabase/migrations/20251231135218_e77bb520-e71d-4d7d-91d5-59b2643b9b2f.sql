-- Update notify_new_message function
-- Shows 📷 Image for image messages and locks search_path for security

CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name TEXT;
  v_notification_message TEXT;
BEGIN
  -- Get sender name safely
  SELECT COALESCE(name, 'Someone')
  INTO v_sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;

  -- Determine notification message
  IF NEW.message_type = 'image' THEN
    v_notification_message := '📷 Image';
  ELSE
    v_notification_message := LEFT(NEW.content, 100);
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
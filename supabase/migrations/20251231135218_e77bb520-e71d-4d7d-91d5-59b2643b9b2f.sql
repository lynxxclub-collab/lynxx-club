-- Update the notify_new_message function to show "📷 Image" for image messages instead of the filename
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_name TEXT;
  v_notification_message TEXT;
BEGIN
  -- Get sender name
  SELECT COALESCE(name, 'Someone') INTO v_sender_name
  FROM profiles WHERE id = NEW.sender_id;
  
  -- Set notification message based on message type
  IF NEW.message_type = 'image' THEN
    v_notification_message := '📷 Image';
  ELSE
    v_notification_message := LEFT(NEW.content, 100);
  END IF;
  
  -- Create notification for recipient
  INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
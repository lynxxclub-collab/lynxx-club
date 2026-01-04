/* ============================================================================
   NOTIFICATIONS FIX PACK (COPY/PASTE)
   - Fix image message notifications showing filename/URL
   - Fix video date notifications double-inserting / missing fields
   - Keeps your existing notification types and table structure
   ============================================================================ */

-- =========================
-- 1) NEW MESSAGE NOTIFICATIONS (fix image preview)
-- =========================
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
  -- Get sender display name
  SELECT COALESCE(name, 'Someone')
    INTO v_sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;

  -- Set notification message based on message type
  IF NEW.message_type = 'image' THEN
    v_notification_message := '📷 Image';
  ELSE
    v_notification_message := LEFT(COALESCE(NEW.content, ''), 100);
  END IF;

  -- Create notification for recipient
  INSERT INTO public.notifications (user_id, type, title, message, related_id, related_type)
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

-- Ensure trigger uses the updated function
DROP TRIGGER IF EXISTS on_new_message ON public.messages;
CREATE TRIGGER on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();


-- =========================
-- 2) VIDEO DATE NOTIFICATIONS (fix double insert + always set content)
-- =========================
CREATE OR REPLACE FUNCTION public.notify_video_date_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seeker_name TEXT;
  v_earner_name TEXT;
BEGIN
  -- Preload names (avoids repeated queries)
  SELECT COALESCE(name, 'Someone') INTO v_seeker_name
  FROM public.profiles WHERE id = NEW.seeker_id;

  SELECT COALESCE(name, 'Someone') INTO v_earner_name
  FROM public.profiles WHERE id = NEW.earner_id;

  -- INSERT = new booking -> notify earner
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, type, title, message, related_id, related_type)
    VALUES (
      NEW.earner_id,
      'video_booking',
      v_seeker_name || ' booked a video date with you',
      'Check your video dates for details',
      NEW.id,
      'video_date'
    );
    RETURN NEW;
  END IF;

  -- UPDATE = only act if status changed
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN

    -- Confirmed -> notify seeker
    IF NEW.status = 'confirmed' THEN
      INSERT INTO public.notifications (user_id, type, title, message, related_id, related_type)
      VALUES (
        NEW.seeker_id,
        'video_booking',
        v_earner_name || ' confirmed your video date',
        'Your video date is confirmed!',
        NEW.id,
        'video_date'
      );
      RETURN NEW;
    END IF;

    -- Cancelled -> notify both
    IF NEW.status = 'cancelled' THEN
      INSERT INTO public.notifications (user_id, type, title, message, related_id, related_type)
      VALUES
        (
          NEW.seeker_id,
          'video_booking',
          'Video date cancelled',
          'Your video date has been cancelled',
          NEW.id,
          'video_date'
        ),
        (
          NEW.earner_id,
          'video_booking',
          'Video date cancelled',
          'Your video date has been cancelled',
          NEW.id,
          'video_date'
        );
      RETURN NEW;
    END IF;

    -- Completed -> notify seeker
    IF NEW.status = 'completed' THEN
      INSERT INTO public.notifications (user_id, type, title, message, related_id, related_type)
      VALUES (
        NEW.seeker_id,
        'video_booking',
        'Video date completed',
        'Hope you had a great time! Don''t forget to leave a rating.',
        NEW.id,
        'video_date'
      );
      RETURN NEW;
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger uses the updated function
DROP TRIGGER IF EXISTS on_video_date_change ON public.video_dates;
CREATE TRIGGER on_video_date_change
  AFTER INSERT OR UPDATE ON public.video_dates
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_video_date_change();


/* ============================================================================
   DONE.
   Paste this whole file into Lovable -> Supabase -> Migrations (or SQL runner),
   run it, and you’re set.
   ============================================================================ */
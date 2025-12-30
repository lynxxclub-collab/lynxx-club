import { useGiftReceivedNotifications } from '@/hooks/useGiftReceivedNotifications';

/**
 * Component that listens for gift notifications for earners.
 * Include this in the app layout to enable app-wide gift toast notifications.
 */
export function GiftReceivedListener() {
  useGiftReceivedNotifications();
  return null;
}

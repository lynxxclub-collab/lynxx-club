import { useGiftReceivedNotifications } from '@/hooks/useGiftReceivedNotifications';

/**
 * Component that listens for gift notifications for earners.
 * Include this in the app layout to enable app-wide gift toast notifications.
 * 
 * Note: Ensure your global Toaster (e.g., from 'sonner') is configured 
 * with a dark theme to match the app's visual style.
 * Example: <Toaster theme="dark" richColors />
 */
export function GiftReceivedListener() {
  useGiftReceivedNotifications();
  return null;
}
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Heart, MessageSquare, Video, DollarSign, Eye, Check, Bookmark, Gift, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { cn } from "@/lib/utils";

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'profile_like':
      return <Heart className="w-4 h-4 text-rose-400" />;
    case 'profile_save':
      return <Bookmark className="w-4 h-4 text-pink-400" />;
    case 'new_message':
      return <MessageSquare className="w-4 h-4 text-purple-400" />;
    case 'video_booking':
    case 'video_update':
      return <Video className="w-4 h-4 text-blue-400" />;
    case 'earning':
    case 'payment':
      return <DollarSign className="w-4 h-4 text-amber-400" />;
    case 'profile_view':
      return <Eye className="w-4 h-4 text-emerald-400" />;
    case 'gift':
      return <Gift className="w-4 h-4 text-fuchsia-400" />;
    default:
      return <Sparkles className="w-4 h-4 text-white/50" />;
  }
};

const getNotificationLink = (notification: Notification): string | null => {
  switch (notification.related_type) {
    case 'message':
    case 'conversation':
      return '/messages';
    case 'video_date':
      return '/video-dates';
    case 'profile':
      return notification.related_id ? `/browse` : null;
    case 'transaction':
    case 'wallet':
      return '/dashboard';
    default:
      return null;
  }
};

// ✅ Inner component that uses the hook (only rendered when user exists)
function NotificationBellContent() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative hover:bg-white/5 rounded-full transition-all",
            "text-white/70 hover:text-white"
          )}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-gradient-to-r from-rose-500 to-purple-500 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.5)] border border-white/10">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent
        align="end"
        className={cn(
          "w-80 sm:w-96 p-0 shadow-2xl shadow-black/80",
          "bg-[#0f0f12]/95 backdrop-blur-xl border-white/10"
        )}
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02]">
          <h3 className="font-semibold text-white tracking-tight">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 h-7 px-2 font-medium"
            >
              <Check className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* List */}
        <ScrollArea className="h-[350px] sm:h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-white/10 border-t-rose-500 rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                <Bell className="w-6 h-6 text-white/20" />
              </div>
              <p className="text-white/50 text-sm font-medium">
                No notifications yet
              </p>
            </div>
          ) : (
            <div className="py-1">
              {notifications.map((notification) => {
                const link = getNotificationLink(notification);
                const content = (
                  <div
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-white/[0.03] last:border-0",
                      notification.read_at
                        ? 'bg-transparent hover:bg-white/[0.03]'
                        : 'bg-rose-500/5 hover:bg-rose-500/10'
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                      <p
                        className={cn(
                          "text-sm font-medium truncate mb-0.5",
                          notification.read_at ? 'text-white/70' : 'text-white'
                        )}
                      >
                        {notification.title}
                      </p>
                      <p
                        className="text-xs text-white/50 line-clamp-2 leading-relaxed"
                      >
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-white/30 mt-1.5 font-medium uppercase tracking-wide">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!notification.read_at && (
                      <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                    )}
                  </div>
                );

                if (link) {
                  return (
                    <Link
                      key={notification.id}
                      to={link}
                      onClick={() => setOpen(false)}
                      className="block"
                    >
                      {content}
                    </Link>
                  );
                }

                return <div key={notification.id}>{content}</div>;
              })}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator className="bg-white/5 m-0" />
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full text-sm text-white/50 hover:text-white hover:bg-white/5 h-9 font-medium"
                onClick={() => setOpen(false)}
              >
                View all notifications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ✅ FIX: Main component guards against missing auth
export default function NotificationBell() {
  const { user, loading } = useAuth();
  
  // Don't render anything if auth is loading or no user
  if (loading || !user) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="relative hover:bg-white/5 rounded-full transition-all text-white/70 hover:text-white"
        disabled
      >
        <Bell className="w-5 h-5" />
      </Button>
    );
  }

  // Only render the notification content when we have a user
  return <NotificationBellContent />;
}

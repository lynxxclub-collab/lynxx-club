import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Heart, MessageSquare, Video, DollarSign, Eye, Check, Bookmark, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';

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
      return <Bell className="w-4 h-4 text-white/50" />;
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

export default function NotificationBell() {
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
          className="relative hover:bg-white/5 rounded-full"
        >
          <Bell className="w-5 h-5 text-white/70 hover:text-white transition-colors" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-gradient-to-r from-rose-500 to-purple-500 rounded-full shadow-lg shadow-rose-500/30">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 bg-[#1a1a1f] border-white/10 shadow-xl shadow-black/50 p-0"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="font-semibold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Notifications
          </h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 h-7 px-2"
            >
              <Check className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="w-10 h-10 text-white/20 mb-2" />
              <p className="text-white/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                No notifications yet
              </p>
            </div>
          ) : (
            <div className="py-1">
              {notifications.map((notification) => {
                const link = getNotificationLink(notification);
                const content = (
                  <div
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                      notification.read_at
                        ? 'bg-transparent hover:bg-white/5'
                        : 'bg-purple-500/5 hover:bg-purple-500/10'
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          notification.read_at ? 'text-white/70' : 'text-white'
                        }`}
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {notification.title}
                      </p>
                      <p
                        className="text-xs text-white/50 mt-0.5 line-clamp-2"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-white/30 mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!notification.read_at && (
                      <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-gradient-to-r from-rose-500 to-purple-500" />
                    )}
                  </div>
                );

                if (link) {
                  return (
                    <Link
                      key={notification.id}
                      to={link}
                      onClick={() => setOpen(false)}
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
            <DropdownMenuSeparator className="bg-white/10 m-0" />
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full text-sm text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
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

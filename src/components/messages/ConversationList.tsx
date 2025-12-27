import { Conversation } from '@/hooks/useMessages';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ProfileImage } from '@/components/ui/ProfileImage';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { MessageSquare, User } from 'lucide-react';

interface ConversationListProps {
  conversations: Conversation[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
}

export default function ConversationList({ 
  conversations, 
  loading, 
  selectedId, 
  onSelect 
}: ConversationListProps) {
  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No conversations yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Start a conversation by messaging someone from the Browse page
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-1">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
              selectedId === conv.id 
                ? "bg-primary/20 border border-primary/30" 
                : "hover:bg-secondary/70"
            )}
          >
            <Avatar className="w-12 h-12 border-2 border-border overflow-hidden">
              <ProfileImage 
                src={conv.other_user?.profile_photos?.[0]} 
                alt={conv.other_user?.name || 'User'}
                className="w-full h-full object-cover"
                fallbackClassName="w-full h-full"
              />
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold truncate">
                  {conv.other_user?.name || 'Unknown User'}
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {conv.last_message?.message_type === 'image' 
                  ? '📷 Image' 
                  : (conv.last_message?.content || 'No messages yet')}
              </p>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
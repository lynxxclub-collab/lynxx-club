import { Conversation } from "@/hooks/useMessages";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { User, Image as ImageIcon, Check, CheckCheck, MessageSquare } from "lucide-react";

interface ConversationListProps {
  conversations: Conversation[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
  isUserOnline?: (userId: string) => boolean;
}

export default function ConversationList({ 
  conversations, 
  loading, 
  selectedId, 
  onSelect, 
  isUserOnline 
}: ConversationListProps) {
  if (loading) {
    return (
      <div className="p-3 sm:p-4 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/5" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24 bg-white/[0.03]" />
                <Skeleton className="h-3 w-10 bg-white/[0.03]" />
              </div>
              <Skeleton className="h-3 w-40 bg-white/[0.03]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500/10 to-purple-500/10 border border-rose-500/20 flex items-center justify-center mb-4">
          <MessageSquare className="w-8 h-8 text-rose-400" />
        </div>
        <h3 className="font-bold text-white mb-2 text-lg">No conversations yet</h3>
        <p className="text-sm text-white/40 max-w-[200px]">
          Start a conversation by messaging someone from the browse page
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full pb-safe">
      <div 
        className="divide-y divide-white/5" 
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {conversations.map((conv) => {
          const isSelected = selectedId === conv.id;
          const lastMessage = conv.last_message;
          // Determine unread status (user received message but hasn't read it)
          const isUnread = lastMessage && !lastMessage.read_at && lastMessage.recipient_id === conv.other_user?.id;

          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv)}
              className={cn(
                "w-full p-3 sm:p-4 flex items-center gap-3 text-left transition-all duration-200 relative group active:scale-[0.99]",
                isSelected 
                  ? "bg-rose-500/5 border-l-4 border-rose-500" 
                  : "border-l-4 border-transparent hover:bg-white/[0.02]"
              )}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <Avatar className="w-12 h-12 border-2 border-white/10">
                  <AvatarImage 
                    src={conv.other_user?.profile_photos?.[0]} 
                    alt={conv.other_user?.name}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-rose-500/20 to-purple-500/20 text-white/60 font-bold">
                    {conv.other_user?.name?.charAt(0) || <User className="w-5 h-5" />}
                  </AvatarFallback>
                </Avatar>
                
                {/* Online Status Indicator */}
                {isUserOnline && conv.other_user?.id && isUserOnline(conv.other_user.id) && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0a0a0f] shadow-sm" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className={cn(
                    "font-bold truncate text-base",
                    isUnread ? "text-white" : "text-white/90"
                  )}>
                    {conv.other_user?.name || "Unknown User"}
                  </span>
                  <span className="text-[10px] sm:text-xs text-white/30 flex-shrink-0 ml-2 font-mono">
                    {conv.last_message_at && formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false })}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Last message preview */}
                  <p className={cn(
                    "text-sm truncate flex-1",
                    isUnread ? "text-white/80 font-medium" : "text-white/50"
                  )}>
                    {lastMessage ? (
                      lastMessage.message_type === "image" ? (
                        <span className="flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-rose-400" />
                          <span className="text-white/70">Sent a photo</span>
                        </span>
                      ) : (
                        lastMessage.content.substring(0, 40) + (lastMessage.content.length > 40 ? "..." : "")
                      )
                    ) : (
                      <span className="text-white/30 italic">Start a conversation</span>
                    )}
                  </p>

                  {/* Read status for sent messages */}
                  {lastMessage && lastMessage.sender_id !== conv.other_user?.id && (
                    <span className="text-white/30 flex-shrink-0">
                      {lastMessage.read_at ? (
                        <CheckCheck className="w-4 h-4 text-blue-400" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </span>
                  )}

                  {/* Unread badge */}
                  {isUnread && (
                    <Badge className="bg-rose-500 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px] text-white border-0 shadow-lg shadow-rose-500/20">
                      1
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}

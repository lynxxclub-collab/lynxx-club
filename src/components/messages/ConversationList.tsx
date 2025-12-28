import { Conversation } from "@/hooks/useMessages";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { User, Image as ImageIcon, Check, CheckCheck } from "lucide-react";

interface ConversationListProps {
  conversations: Conversation[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
}

export default function ConversationList({ conversations, loading, selectedId, onSelect }: ConversationListProps) {
  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <User className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold mb-1">No conversations yet</h3>
        <p className="text-sm text-muted-foreground">Start a conversation by messaging someone from the browse page</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y divide-border">
        {conversations.map((conv) => {
          const isSelected = selectedId === conv.id;
          const lastMessage = conv.last_message;
          const isUnread = lastMessage && !lastMessage.read_at && lastMessage.recipient_id === conv.other_user?.id;
          const isOnline = Math.random() > 0.5; // Replace with real presence

          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv)}
              className={cn(
                "w-full p-4 flex items-center gap-3 text-left transition-colors",
                "hover:bg-secondary/50",
                isSelected && "bg-secondary",
              )}
            >
              {/* Avatar with online indicator */}
              <div className="relative flex-shrink-0">
                <Avatar className="w-12 h-12 border border-border">
                  <AvatarImage src={conv.other_user?.profile_photos?.[0]} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-purple-500/20">
                    {conv.other_user?.name?.charAt(0) || <User className="w-5 h-5" />}
                  </AvatarFallback>
                </Avatar>
                {isOnline && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-background" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={cn("font-semibold truncate", isUnread && "text-foreground")}>
                    {conv.other_user?.name || "Unknown User"}
                  </span>
                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                    {conv.last_message_at && formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false })}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Last message preview */}
                  <p
                    className={cn(
                      "text-sm truncate flex-1",
                      isUnread ? "text-foreground font-medium" : "text-muted-foreground",
                    )}
                  >
                    {lastMessage ? (
                      lastMessage.message_type === "image" ? (
                        <span className="flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          Photo
                        </span>
                      ) : (
                        lastMessage.content.substring(0, 50) + (lastMessage.content.length > 50 ? "..." : "")
                      )
                    ) : (
                      "Start a conversation"
                    )}
                  </p>

                  {/* Read status for sent messages */}
                  {lastMessage && lastMessage.sender_id !== conv.other_user?.id && (
                    <span className="text-muted-foreground flex-shrink-0">
                      {lastMessage.read_at ? (
                        <CheckCheck className="w-4 h-4 text-blue-500" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </span>
                  )}

                  {/* Unread badge */}
                  {isUnread && (
                    <Badge className="bg-primary h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs">
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

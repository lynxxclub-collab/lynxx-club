import { Conversation } from "@/hooks/useMessages";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Check, CheckCheck, Image as ImageIcon, MessageSquare } from "lucide-react";

interface ConversationListProps {
  conversations: Conversation[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
}

export default function ConversationList({ conversations, loading, selectedId, onSelect }: ConversationListProps) {
  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3">
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
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <MessageSquare className="w-8 h-8 text-primary" />
        </div>
        <h3 className="font-semibold text-lg mb-1">No conversations yet</h3>
        <p className="text-sm text-muted-foreground">Start chatting with someone from the browse page</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y divide-border/50">
        {conversations.map((conv) => {
          const isSelected = selectedId === conv.id;
          const hasUnread = (conv.unread_count || 0) > 0;
          const lastMessage = conv.last_message;

          // Get preview text from last message
          let previewText = "No messages yet";
          let isImage = false;

          if (lastMessage) {
            if (lastMessage.message_type === "image") {
              previewText = "Photo";
              isImage = true;
            } else {
              previewText = lastMessage.content?.substring(0, 50) || "";
              if (lastMessage.content?.length > 50) previewText += "...";
            }
          }

          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv)}
              className={cn(
                "w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-secondary/50",
                isSelected && "bg-secondary",
                hasUnread && "bg-primary/5",
              )}
            >
              {/* Avatar with online indicator */}
              <div className="relative shrink-0">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={conv.other_user?.profile_photos?.[0]} />
                  <AvatarFallback className="bg-primary/10">{conv.other_user?.name?.charAt(0) || "?"}</AvatarFallback>
                </Avatar>
                {/* Online indicator - placeholder */}
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-background" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={cn("font-semibold truncate", hasUnread && "text-foreground")}>
                    {conv.other_user?.name || "Unknown"}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    {conv.last_message_at
                      ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false })
                      : ""}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <p
                    className={cn(
                      "text-sm truncate flex items-center gap-1",
                      hasUnread ? "text-foreground font-medium" : "text-muted-foreground",
                    )}
                  >
                    {isImage && <ImageIcon className="w-3.5 h-3.5 shrink-0" />}
                    {previewText}
                  </p>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {/* Read receipt indicator */}
                    {lastMessage && lastMessage.sender_id !== conv.other_user?.id && (
                      <span className={cn("text-xs", lastMessage.read_at ? "text-blue-500" : "text-muted-foreground")}>
                        {lastMessage.read_at ? <CheckCheck className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                      </span>
                    )}

                    {/* Unread badge */}
                    {hasUnread && (
                      <Badge className="h-5 min-w-[20px] px-1.5 flex items-center justify-center bg-primary text-xs">
                        {conv.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}

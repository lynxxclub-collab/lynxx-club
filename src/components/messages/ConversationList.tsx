import React, { useMemo } from "react";
import { Conversation } from "@/hooks/useMessages";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNowStrict } from "date-fns";
import { cn } from "@/lib/utils";
import { User, Image as ImageIcon, Check, CheckCheck, MessageSquare } from "lucide-react";

interface ConversationListProps {
  conversations: Conversation[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
  isUserOnline?: (userId: string) => boolean;
}

function LastMessagePreview({ conv }: { conv: Conversation }) {
  const last = conv.last_message;

  if (!last) return <span>Start a conversation</span>;

  if (last.message_type === "image") {
    return (
      <span className="inline-flex items-center gap-1">
        <ImageIcon className="w-3 h-3 text-rose-400" />
        Photo
      </span>
    );
  }

  const text = (last.content || "").trim();
  if (!text) return <span>Message</span>;

  return <span>{text.length > 60 ? `${text.slice(0, 60)}…` : text}</span>;
}

export default function ConversationList({
  conversations,
  loading,
  selectedId,
  onSelect,
  isUserOnline,
}: ConversationListProps) {
  const hasConvos = conversations?.length > 0;

  const rows = useMemo(() => conversations ?? [], [conversations]);

  if (loading) {
    return (
      <div className="p-4 space-y-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-full bg-white/5" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-28 bg-white/5" />
              <Skeleton className="h-3 w-44 bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!hasConvos) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full p-8 text-center"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
          <MessageSquare className="w-8 h-8 text-purple-400" />
        </div>
        <h3 className="font-semibold text-white mb-1">No conversations yet</h3>
        <p className="text-sm text-white/40">Start a conversation by messaging someone from the browse page</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y divide-white/5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {rows.map((conv) => {
          const other = conv.other_user;
          const isSelected = selectedId === conv.id;

          const last = conv.last_message;
          const lastAt = conv.last_message_at ? new Date(conv.last_message_at) : null;

          // "Unread" means: last message exists, I am the recipient, and read_at is null
          const isUnread = Boolean(last && !last.read_at && last.recipient_id !== other?.id); // <-- if this is wrong in your schema, swap logic below
          // If your schema is: other_user is the person you're chatting with, and unread means last message was sent by them to me:
          // const isUnread = Boolean(last && !last.read_at && last.sender_id === other?.id);

          const showOnline = Boolean(isUserOnline && other?.id && isUserOnline(other.id));

          const showReadReceipt = Boolean(last && other?.id && last.sender_id !== other.id);

          return (
            <button
              key={conv.id}
              type="button"
              onClick={() => onSelect(conv)}
              className={cn(
                "w-full p-4 flex items-center gap-3 text-left transition-colors",
                "hover:bg-white/[0.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40",
                isSelected ? "bg-white/[0.05] border-l-2 border-rose-500" : "border-l-2 border-transparent",
              )}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <Avatar className="w-12 h-12 border-2 border-white/10">
                  <AvatarImage src={other?.profile_photos?.[0]} alt={other?.name || "User"} />
                  <AvatarFallback className="bg-gradient-to-br from-rose-500/20 to-purple-500/20 text-white/70">
                    {other?.name?.charAt(0) || <User className="w-5 h-5" />}
                  </AvatarFallback>
                </Avatar>

                {showOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0a0a0f]" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className={cn("font-semibold truncate", isUnread ? "text-white" : "text-white/80")}>
                    {other?.name || "Unknown User"}
                  </span>

                  <span className="text-xs text-white/30 flex-shrink-0">
                    {lastAt ? formatDistanceToNowStrict(lastAt, { addSuffix: false }) : ""}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <p className={cn("text-sm truncate flex-1", isUnread ? "text-white/70 font-medium" : "text-white/40")}>
                    <LastMessagePreview conv={conv} />
                  </p>

                  {/* Read status for my sent message */}
                  {showReadReceipt && (
                    <span className="text-white/30 flex-shrink-0" aria-label={last?.read_at ? "Read" : "Sent"}>
                      {last?.read_at ? <CheckCheck className="w-4 h-4 text-blue-400" /> : <Check className="w-4 h-4" />}
                    </span>
                  )}

                  {/* Unread badge */}
                  {isUnread && (
                    <Badge className="bg-rose-500 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs text-white border-0">
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

import React, { useMemo } from "react";
import { Conversation } from "@/hooks/useMessages";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNowStrict } from "date-fns";
import { cn } from "@/lib/utils";
import { User, Image as ImageIcon, Check, CheckCheck, MessageSquare } from "lucide-react";

interface ConversationListViewProps {
  conversations: Conversation[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
  isUserOnline?: (userId: string) => boolean;
}

/**
 * IMPORTANT:
 * Unread logic depends on how your backend models `last_message`.
 * Commonly, unread means:
 *  - last_message.read_at is null
 *  - last_message.sender_id === other_user.id  (they sent it)
 * If your schema differs, tweak `isUnread` below.
 */

function LastPreview({ conv }: { conv: Conversation }) {
  const last = conv.last_message;
  if (!last) return <span>Start a conversation</span>;

  if (last.message_type === "image") {
    return (
      <span className="inline-flex items-center gap-1">
        <ImageIcon className="w-3 h-3 text-primary" />
        Photo
      </span>
    );
  }

  const text = (last.content || "").trim();
  if (!text) return <span>Message</span>;

  return <span>{text.length > 70 ? `${text.slice(0, 70)}…` : text}</span>;
}

export default function ConversationListView({
  conversations,
  loading,
  selectedId,
  onSelect,
  isUserOnline,
}: ConversationListViewProps) {
  const rows = useMemo(() => conversations ?? [], [conversations]);

  return (
    <div className="h-full flex flex-col bg-transparent" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 p-4 border-b border-white/5 bg-[#0a0a0f]/95 backdrop-blur-xl safe-area-top">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-3 text-white">
          <div className="w-12 h-12 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-purple-500/20 flex items-center justify-center">
            <MessageSquare className="w-6 h-6 sm:w-5 sm:h-5 text-primary" />
          </div>
          Messages
        </h1>
      </div>

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="w-14 h-14 rounded-full bg-white/5" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-28 bg-white/5" />
                  <Skeleton className="h-4 w-44 bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500/20 to-purple-500/20 flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-white/40" />
            </div>
            <h3 className="font-semibold text-white mb-1">No conversations yet</h3>
            <p className="text-sm text-white/50">Start a conversation by messaging someone from the browse page</p>
          </div>
        ) : (
          <div className="p-2">
            {rows.map((conv) => {
              const isSelected = selectedId === conv.id;
              const other = conv.other_user;

              const last = conv.last_message;
              const lastAt = conv.last_message_at ? new Date(conv.last_message_at) : null;

              // Recommended unread logic (most common)
              const isUnread = Boolean(last && !last.read_at && last.sender_id === other?.id);

              const showOnline = Boolean(isUserOnline && other?.id && isUserOnline(other.id));

              const showReadReceipt = Boolean(last && other?.id && last.sender_id !== other.id);

              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => onSelect(conv)}
                  className={cn(
                    "w-full p-4 min-h-[72px] flex items-center gap-4 text-left rounded-xl mb-2",
                    "transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40",
                    isSelected
                      ? "bg-white/[0.08] border border-white/10"
                      : "hover:bg-white/[0.04] border border-transparent active:bg-white/[0.06]",
                  )}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-14 h-14 border-2 border-white/10">
                      <AvatarImage src={other?.profile_photos?.[0]} alt={other?.name || "User"} />
                      <AvatarFallback className="bg-gradient-to-br from-rose-500/30 to-purple-500/30 text-white text-lg">
                        {other?.name?.charAt(0) || <User className="w-6 h-6" />}
                      </AvatarFallback>
                    </Avatar>

                    {showOnline && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#0a0a0f]" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className={cn("font-semibold text-base truncate", isUnread ? "text-white" : "text-white/80")}>
                        {other?.name || "Unknown User"}
                      </span>

                      <span className="text-sm text-white/40 flex-shrink-0 ml-2">
                        {lastAt ? formatDistanceToNowStrict(lastAt, { addSuffix: false }) : ""}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Last message preview */}
                      <p
                        className={cn(
                          "text-sm truncate flex-1",
                          isUnread ? "text-white/70 font-medium" : "text-white/50",
                        )}
                      >
                        <LastPreview conv={conv} />
                      </p>

                      {/* Read status for my sent messages */}
                      {showReadReceipt && (
                        <span className="text-white/40 flex-shrink-0" aria-label={last?.read_at ? "Read" : "Sent"}>
                          {last?.read_at ? <CheckCheck className="w-4 h-4 text-blue-400" /> : <Check className="w-4 h-4" />}
                        </span>
                      )}

                      {/* Unread badge */}
                      {isUnread && (
                        <Badge className="bg-primary h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs text-primary-foreground border-0">
                          1
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
